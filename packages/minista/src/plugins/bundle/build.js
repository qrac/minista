/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { getGlobImportCode } from "./utils/code.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getBuildBase, getBasedAssetUrl } from "../../shared/url.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginBundleBuild(opts) {
  const cwd = process.cwd()
  const names = ["bundle", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const regImg = /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  /** @type {Set<string>} */
  let importedImageFiles = new Set()

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.resolve(tempDir, "glob")
      globFile = path.resolve(globDir, `${tempName}.js`)

      if (isSsr) return

      const code = getGlobImportCode(opts)
      await fs.promises.mkdir(globDir, { recursive: true })
      await fs.promises.writeFile(globFile, code, "utf8")

      return {
        build: {
          rollupOptions: {
            input: {
              [tempName]: globFile,
            },
          },
        },
      }
    },
    load(id) {
      if (isSsr) return
      if (regImg.test(id)) {
        const relativePath = normalizePath(path.relative(rootDir, id))
        importedImageFiles.add(relativePath)
      }
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)

      /** @type {string[]} */
      let bundleCssFiles = []
      /** @type {string[]} */
      let bundleImageFiles = []

      for (const [key, item] of Object.entries(outputChunks)) {
        if (item.name !== tempName) continue
        bundleCssFiles = item.viteMetadata?.importedCss
          ? [...item.viteMetadata?.importedCss]
          : []
        delete bundle[key]
        break
      }

      bundleCssFiles = bundleCssFiles.map((file) => {
        const fileName = file.replace(tempName, opts.outName)
        outputAssets[file].fileName = fileName
        if (!opts.useExportCss) delete bundle[file]
        return fileName
      })
      if (!opts.useExportCss) bundleCssFiles = []

      bundleImageFiles = [...importedImageFiles].map((file) => {
        const targetItem = Object.values(outputAssets).find((item) =>
          item.originalFileNames.some((name) => name === file)
        )
        return targetItem.fileName
      })

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })

      for (const item of htmlItems) {
        const htmlName = item.fileName
        let newHtml = String(item.source)

        for (const file of bundleCssFiles) {
          const basedAssetUrl = getBasedAssetUrl(base, htmlName, file)
          const linkTag = `<link rel="stylesheet" href="${basedAssetUrl}">`
          newHtml = newHtml.replace("</head>", `${linkTag}</head>`)
        }

        if (base === "./" || base === "") {
          for (const file of bundleImageFiles) {
            const basedAssetUrl = getBasedAssetUrl(base, htmlName, file)
            const regExp = new RegExp(`(<[^>]*?)/${file}([^>]*?>)`, "gs")
            newHtml = newHtml.replace(regExp, `$1${basedAssetUrl}$2`)
          }
        }
        item.source = newHtml
      }
    },
  }
}
