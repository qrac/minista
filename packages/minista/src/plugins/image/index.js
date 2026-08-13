/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { NodeImageGenerator } from "../../adapters/image/index.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { processViteDocuments } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectImageReferences,
  composeImageDocument,
  createImageFeature,
  createImageOutputsArtifactId,
  DevImagePageIndex,
} from "../../features/image/index.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getHtmlPageUrl } from "../../shared/filename.js"
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

  const devStates = new ViteEnvironmentState(() => ({
    rootDir: "",
    imageDir: "",
    base: "/",
    /** @type {NodeImageGenerator | undefined} */
    generator: undefined,
    pageIndex: new DevImagePageIndex(),
    watchedSources: /** @type {Set<string>} */ (new Set()),
  }))
  const devServers = new ViteDevServerRegistry()
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))

  /** @param {import("vite").ViteDevServer} server */
  function getDevState(server) {
    const state = devStates.get(server)
    if (!state.generator) {
      state.rootDir = getRootDir(cwd, server.config.root || "")
      state.imageDir = path.resolve(getTempDir(cwd, state.rootDir), "image")
      state.base = getServeBase(server.config.base || "/")
      state.generator = new NodeImageGenerator(
        state.rootDir,
        state.imageDir,
        true,
      )
    }
    return state
  }

  return {
    name: "vite-plugin:minista-image",
    api: {
      minista: {
        outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims,
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
    apply(_, { command }) {
      return command === "serve" || command === "build"
    },
    async config(config, { command, isSsrBuild }) {
      const rootDir = getRootDir(cwd, config.root || "")
      const tempDir = getTempDir(cwd, rootDir)
      const imageDir = path.resolve(tempDir, "image")
      await fs.promises.mkdir(imageDir, { recursive: true })

      if (command === "serve") {
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
      const isAppBuild = Boolean(getViteAppEnvironmentNames(config))
      if (command === "build" && !isAppBuild && isSsrBuild) {
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
        }
      }
    },
    async configureServer(server) {
      devServers.add(server)
      server.httpServer?.once("close", () => devServers.delete(server))
      const state = getDevState(server)
      await fs.promises.mkdir(state.imageDir, { recursive: true })
      const updates = new ViteDevUpdateAdapter(server)
      server.watcher.on("all", (event, filePath) => {
        if (!["add", "change", "unlink"].includes(event)) return
        const source = normalizePath(path.relative(state.rootDir, filePath))
        const pages = state.pageIndex.getPages(source)
        if (pages.length > 0) updates.reloadPages(pages)
      })
    },
    async transformIndexHtml(html, context) {
      const server = devServers.resolve(context)
      if (!server) return html
      const state = getDevState(server)
      if (!state.generator) return html
      const pageId = createNodeId(
        "page",
        "legacy-image-dev",
        context?.path || "/",
      )
      const document = documents.parse({ pageId, html })
      const references = collectImageReferences(document)
      const localSources = [...new Set(
        references
          .map(({ source }) => source)
          .filter((source) => !source.startsWith("http")),
      )]
      state.pageIndex.replacePage(context?.path || "/", localSources)
      for (const source of localSources) {
        const sourceFile = path.resolve(
          state.rootDir,
          source.replace(/^\//, ""),
        )
        if (state.watchedSources.has(sourceFile)) continue
        state.watchedSources.add(sourceFile)
        server.watcher.add(sourceFile)
      }
      if (references.length === 0) return html
      const generated = await state.generator.generate(references, opts)

      /** @type {Map<string, string>} */
      const outputUrls = new Map()
      for (const artifact of generated.artifacts) {
        const outputFile = path.resolve(state.imageDir, artifact.fileName)
        await fs.promises.mkdir(path.dirname(outputFile), { recursive: true })
        await fs.promises.writeFile(outputFile, artifact.content)
        outputUrls.set(
          artifact.id,
          `${trimEndSlash(state.base)}${imageAlias}/${normalizePath(artifact.fileName)}`,
        )
      }
      composeImageDocument(document, generated.plans, {
        resolve: (artifactId) => outputUrls.get(artifactId),
      })
      return document.serialize()
    },
    transform(code, id) {
      const appEnvironmentNames = getViteAppEnvironmentNames(
        this.environment.getTopLevelConfig(),
      )
      const isAppRender =
        Boolean(appEnvironmentNames) &&
        this.environment.name === appEnvironmentNames?.renderName
      const isLegacyRender = Boolean(this.environment.config.build.ssr)
      const isDev = this.environment.config.command === "serve"
      if (
        (!isDev && !isLegacyRender && !isAppRender) ||
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
      const appEnvironmentNames = getViteAppEnvironmentNames(
        this.environment.getTopLevelConfig(),
      )
      if (
        this.environment.config.build.ssr ||
        (appEnvironmentNames &&
          this.environment.name !== appEnvironmentNames?.clientName)
      ) return
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      const imageDir = path.resolve(getTempDir(cwd, rootDir), "image")
      const generator = new NodeImageGenerator(rootDir, imageDir, false)
      const base = getBuildBase(this.environment.config.base || "/")
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
      const htmlItems = Object.values(filterOutputAssets(bundle)).filter(
        (item) => item.fileName.endsWith(".html"),
      )
      const pages = htmlItems.map((item) => ({
        item,
        fileName: item.fileName,
        url: getHtmlPageUrl(item.fileName),
        html: String(item.source),
      }))
      /** @type {Map<string, string>} */
      const outputFiles = new Map()
      const pageFileNames = new Map()
      const feature = createImageFeature(opts, generator, {
        resolve(artifactId, pageId) {
          const outputFile = outputFiles.get(artifactId)
          const pageFileName = pageFileNames.get(pageId)
          return outputFile && pageFileName
            ? getBasedAssetUrl(base, pageFileName, outputFile)
            : undefined
        },
      })
      const result = await processViteDocuments(
        pages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [feature],
        undefined,
        {
          beforeCompose: async ({ artifacts, graph }) => {
            for (const page of graph.pages.values()) {
              const route = graph.routes.get(page.routeId)
              if (route) pageFileNames.set(page.id, route.pageModuleId)
            }
            /** @type {import("../../features/image/index.js").ImageReference[]} */
            const references = artifacts
              .filter((record) =>
                record.owner === feature.id &&
                record.mediaType ===
                  "application/vnd.minista.image-references+json"
              )
              .flatMap((record) => JSON.parse(String(record.content)))
            const outputsRecord = artifacts.find(
              ({ id }) => id === createImageOutputsArtifactId(),
            )
            /** @type {import("../../features/image/index.js").GeneratedImageOutput[]} */
            const outputs = outputsRecord
              ? JSON.parse(String(outputsRecord.content))
              : []
            const records = new Map(artifacts.map((record) => [record.id, record]))
            for (const output of outputs) {
              const artifact = records.get(output.id)
              if (!artifact) continue
              const referenceId = this.emitFile({
                type: "asset",
                name: path.basename(output.fileName),
                source: artifact.content,
              })
              const fileName = this.getFileName(referenceId)
              outputFiles.set(output.id, fileName)
              outputClaims.push(Object.freeze({
                id: output.id,
                kind: "image",
                owner: feature.id,
                source: output.source,
                fileName,
                pageUrls: Object.freeze([
                  ...new Set(references
                    .filter(({ source }) => source === output.source)
                    .map(({ pageId }) => graph.pages.get(pageId)?.url)
                    .filter((url) => url !== undefined)),
                ]),
                dependencies: Object.freeze([]),
              }))
            }
          },
        },
      )
      const outputDocuments = new Map(
        result.documents.map((document) => [document.fileName, document]),
      )
      for (const page of pages) {
        const output = outputDocuments.get(page.fileName)
        if (output && output.html !== page.html) page.item.source = output.html
      }
    },
  }
}
