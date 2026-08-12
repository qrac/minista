/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { createNodeId } from "../../core/graph/index.js"
import { composeBundleDocument } from "../../features/bundle/index.js"
import { getGlobImportCode } from "./utils/code.js"
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
const documents = new NodeHtmlDocumentFactory()

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

  return {
    name: "vite-plugin:minista-bundle",
    api: { minista: { feature: { id: "bundle", apiVersion: 1, options: opts, provides: ["client-bundle"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    config: async (config) => {
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
    generateBundle(options, bundle) {
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

      for (const item of htmlItems) {
        const document = documents.parse({
          pageId: createNodeId("page", "legacy-bundle-compose", item.fileName),
          html: String(item.source),
        })
        composeBundleDocument(
          document,
          {
            cssFiles,
            imageFiles,
            rewriteRootImages: base === "./" || base === "",
          },
          {
            resolve: (fileName) =>
              getBasedAssetUrl(base, item.fileName, fileName),
          },
        )
        item.source = document.serialize()
      }
    },
  }
}
