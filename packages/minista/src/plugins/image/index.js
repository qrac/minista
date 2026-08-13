/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { NodeImageGenerator } from "../../adapters/image/index.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectImageReferences,
  composeImageDocument,
  DevImagePageIndex,
} from "../../features/image/index.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  getServeBase,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import {
  mergeSsrNoExternal,
  mergeAlias,
  filterOutputAssets,
} from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {PluginOptions} */
export const defaultOptions = {
  useCache: true,
  optimize: {
    outName: "[name]-[width]x[height]",
    remoteName: "remote-[index]",
    layout: "constrained",
    breakpoints: [320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840],
    resolutions: [1, 2],
    format: "inherit",
    formatOptions: {},
    quality: undefined,
    aspect: undefined,
    fit: "cover",
    position: "centre",
    background: undefined,
  },
  decoding: "async",
  loading: "eager",
}

const documents = new NodeHtmlDocumentFactory()

/**
 * @param {string} value
 */
function trimEndSlash(value) {
  return value.replace(/\/$/, "")
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginImage(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()
  const imageAlias = "/@__minista-image"
  const cpImagePath = normalizePath(path.resolve(__dirname, "components/image.js"))
  const cpPicturePath = normalizePath(
    path.resolve(__dirname, "components/picture.js"),
  )

  let isDev = false
  let isSsr = false
  let isBuild = false
  let isAppBuild = false
  /** @type {Required<import("../../adapters/vite/app-config.js").ViteAppEnvironmentNames> | undefined} */
  let appEnvironmentNames
  let base = "/"
  let rootDir = ""
  let imageDir = ""
  /** @type {NodeImageGenerator | undefined} */
  let generator
  /** @type {ViteDevServer | undefined} */
  let viteServer
  const devPageIndex = new DevImagePageIndex()
  const watchedSources = new Set()

  return {
    name: "vite-plugin:minista-image",
    api: {
      minista: {
        feature: {
          id: "image",
          apiVersion: 1,
          options: opts,
          provides: ["image-assets"],
          requires: ["html-documents"],
        },
      },
    },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      isDev = command === "serve"
      appEnvironmentNames = getViteAppEnvironmentNames(config)
      isAppBuild = command === "build" && Boolean(appEnvironmentNames)
      isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      isBuild = command === "build" && !isAppBuild && !isSsrBuild
      return isDev || isAppBuild || isSsr || isBuild
    },
    async config(config) {
      rootDir = getRootDir(cwd, config.root || "")
      const tempDir = getTempDir(cwd, rootDir)
      imageDir = path.resolve(tempDir, "image")
      generator = new NodeImageGenerator(rootDir, imageDir, isDev)
      await fs.promises.mkdir(imageDir, { recursive: true })

      if (isDev) {
        base = getServeBase(config.base || base)
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
          resolve: {
            alias: mergeAlias(config, [
              {
                find: imageAlias,
                replacement: normalizePath(imageDir),
              },
            ]),
          },
        }
      }
      if (isSsr) {
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
        }
      }
      if (isBuild || isAppBuild) base = getBuildBase(config.base || base)
    },
    configureServer(server) {
      viteServer = server
      const updates = new ViteDevUpdateAdapter(server)
      server.watcher.on("all", (event, filePath) => {
        if (!["add", "change", "unlink"].includes(event)) return
        const source = normalizePath(path.relative(rootDir, filePath))
        const pages = devPageIndex.getPages(source)
        if (pages.length > 0) updates.reloadPages(pages)
      })
    },
    async transformIndexHtml(html, context) {
      if (!generator) return html
      const pageId = createNodeId(
        "page",
        "legacy-image-dev",
        context?.path || "/",
      )
      const document = documents.parse({ pageId, html })
      const references = collectImageReferences(document)
      if (isDev) {
        const localSources = [...new Set(
          references
            .map(({ source }) => source)
            .filter((source) => !source.startsWith("http")),
        )]
        devPageIndex.replacePage(context?.path || "/", localSources)
        for (const source of localSources) {
          const sourceFile = path.resolve(rootDir, source.replace(/^\//, ""))
          if (watchedSources.has(sourceFile)) continue
          watchedSources.add(sourceFile)
          viteServer?.watcher.add(sourceFile)
        }
      }
      if (references.length === 0) return html
      const generated = await generator.generate(references, opts)

      /** @type {Map<string, string>} */
      const outputUrls = new Map()
      for (const artifact of generated.artifacts) {
        const outputFile = path.resolve(imageDir, artifact.fileName)
        await fs.promises.mkdir(path.dirname(outputFile), { recursive: true })
        await fs.promises.writeFile(outputFile, artifact.content)
        outputUrls.set(
          artifact.id,
          `${trimEndSlash(base)}${imageAlias}/${normalizePath(artifact.fileName)}`,
        )
      }
      composeImageDocument(document, generated.plans, {
        resolve: (artifactId) => outputUrls.get(artifactId),
      })
      return document.serialize()
    },
    transform(code, id) {
      const isAppRender =
        isAppBuild &&
        this.environment.name === appEnvironmentNames?.renderName
      if (
        (isBuild || (isAppBuild && !isAppRender)) ||
        ![cpImagePath, cpPicturePath].includes(id)
      ) return

      const { decoding, loading, optimize } = opts
      const optimizeStr = `JSON.parse(\`${JSON.stringify(optimize)}\`)`
      return code
        .replace(/(const defaultDecoding = )"async"/, `$1"${decoding}"`)
        .replace(/(const defaultLoading = )"eager"/, `$1"${loading}"`)
        .replace(/(const defaultOptimize = )\{\}/, `$1${optimizeStr}`)
    },
    async generateBundle(_options, bundle) {
      if (
        isSsr ||
        (isAppBuild &&
          this.environment.name !== appEnvironmentNames?.clientName) ||
        !generator
      ) return
      const htmlItems = Object.values(filterOutputAssets(bundle)).filter(
        (item) => item.fileName.endsWith(".html"),
      )
      const pages = htmlItems.map((item) => ({
        item,
        document: documents.parse({
          pageId: createNodeId("page", "legacy-image-build", item.fileName),
          html: String(item.source),
        }),
      }))
      const references = pages.flatMap(({ document }) =>
        collectImageReferences(document),
      )
      if (references.length === 0) return
      const generated = await generator.generate(references, opts)

      /** @type {Map<string, string>} */
      const outputFiles = new Map()
      for (const artifact of generated.artifacts) {
        const referenceId = this.emitFile({
          type: "asset",
          name: path.basename(artifact.fileName),
          source: artifact.content,
        })
        outputFiles.set(artifact.id, this.getFileName(referenceId))
      }
      for (const { item, document } of pages) {
        composeImageDocument(document, generated.plans, {
          resolve: (artifactId) => {
            const outputFile = outputFiles.get(artifactId)
            return outputFile
              ? getBasedAssetUrl(base, item.fileName, outputFile)
              : undefined
          },
        })
        item.source = document.serialize()
      }
    },
  }
}
