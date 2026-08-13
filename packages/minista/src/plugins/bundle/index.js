/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { processViteDocuments } from "../../adapters/vite/compatibility-lifecycle.js"
import { createNodeId } from "../../core/graph/index.js"
import { createBundleFeature } from "../../features/bundle/index.js"
import { getGlobImportCode } from "./utils/code.js"
import { getHtmlPageUrl } from "../../shared/filename.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  getServeBase,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import { regImage } from "../../shared/reg.js"
import {
  mergeAlias,
  filterOutputChunks,
  filterOutputAssets,
} from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: ["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"],
  outName: "bundle",
  useExportCss: true,
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginBundle(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()
  const aliasGlob = `/@__minista-bundle-glob`
  const tempName = "__minista-bundle"

  let isDev = false
  let isSsr = false
  let isBuild = false

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  /** @type {Set<string>} */
  let importedImageFiles = new Set()
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  let outputClaims = []

  return {
    name: "vite-plugin:minista-bundle",
    api: { minista: { outputClaims: () => outputClaims, feature: { id: "bundle", apiVersion: 1, options: opts, provides: ["client-bundle"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    config: async (config) => {
      importedImageFiles = new Set()
      outputClaims = []
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.resolve(tempDir, "glob")

      const code = getGlobImportCode(opts)
      await fs.promises.mkdir(globDir, { recursive: true })

      if (isDev) {
        base = getServeBase(config.base || base)
        globFile = path.resolve(globDir, `${tempName}.js`)
        await fs.promises.writeFile(globFile, code, "utf8")
        return {
          resolve: {
            alias: mergeAlias(config, [
              {
                find: aliasGlob,
                replacement: globFile,
              },
            ]),
          },
        }
      }
      if (isBuild) {
        base = getBuildBase(config.base || base)
        globFile = path.resolve(globDir, `${opts.outName}.js`)
        await fs.promises.writeFile(globFile, code, "utf8")
        return {
          build: {
            rolldownOptions: {
              input: {
                [opts.outName]: globFile,
              },
            },
          },
        }
      }
    },
    transformIndexHtml(html) {
      const prefixBase = base.replace(/\/$/, "")
      const scriptTag = `<script type="module" src="${prefixBase}${aliasGlob}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
    load(id) {
      if (isDev) return
      if (regImage.test(id)) {
        const relativePath = normalizePath(path.relative(rootDir, id))
        importedImageFiles.add(relativePath)
      }
    },
    async generateBundle(options, bundle) {
      outputClaims = []
      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)

      /** @type {string[]} */
      let cssFiles = []
      /** @type {string[]} */
      let imageFiles = []

      for (const [key, item] of Object.entries(outputChunks)) {
        if (item.facadeModuleId !== normalizePath(globFile)) continue
        cssFiles = item.viteMetadata?.importedCss
          ? [...item.viteMetadata?.importedCss]
          : []
        delete bundle[key]
        break
      }
      if (!opts.useExportCss) {
        for (const file of cssFiles) {
          delete bundle[file]
        }
        cssFiles = []
      }

      imageFiles = [...importedImageFiles]
        .map((file) => {
          const targetItem = Object.values(outputAssets).find((item) =>
            item.originalFileNames.some((name) => name === file),
          )
          return targetItem?.fileName
        })
        .filter(
          /**
           * @param {string | undefined} file
           * @returns {file is string}
           */
          (file) => Boolean(file),
        )

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })
      const plan = {
        cssFiles,
        imageFiles,
        rewriteRootImages: base === "./" || base === "",
      }
      const pages = htmlItems.map((item) => ({
        item,
        fileName: item.fileName,
        url: getHtmlPageUrl(item.fileName),
        html: String(item.source),
      }))
      const pageFileNames = new Map()
      const result = await processViteDocuments(
        pages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [createBundleFeature(
          opts,
          { bundle: async () => plan },
          {
            resolve(fileName, pageId) {
              const pageFileName = pageFileNames.get(pageId)
              return pageFileName
                ? getBasedAssetUrl(base, pageFileName, fileName)
                : undefined
            },
          },
        )],
        ["analyze", "bundle", "compose"],
        {
          beforeCompose({ graph }) {
            for (const page of graph.pages.values()) {
              const route = graph.routes.get(page.routeId)
              if (route) pageFileNames.set(page.id, route.pageModuleId)
            }
          },
        },
      )
      /** @type {import("../../features/bundle/index.js").BundleOutputReference[]} */
      const references = result.artifacts
        .filter((record) =>
          record.mediaType ===
            "application/vnd.minista.bundle-output-references+json"
        )
        .map((record) => JSON.parse(String(record.content)))
      const pageUrls = new Map(
        [...result.graph.pages.values()].map(({ id, url }) => [id, url]),
      )
      const cssSet = new Set(cssFiles)
      for (const fileName of [...cssFiles, ...imageFiles]) {
        outputClaims.push(Object.freeze({
          id: createNodeId("artifact", "bundle-output", fileName),
          kind: cssSet.has(fileName) ? "style" : "image",
          owner: createNodeId("feature", "bundle"),
          source: opts.outName,
          fileName,
          pageUrls: Object.freeze(references
            .filter(({ fileNames }) => fileNames.includes(fileName))
            .map(({ pageId }) => pageUrls.get(pageId))
            .filter((url) => url !== undefined)),
          dependencies: Object.freeze([]),
        }))
      }

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
