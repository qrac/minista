/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types.js').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"

import { getPluginName } from "../../shared/name.js"
import {
  getRootDir,
  getTempDir,
  pathToId,
  idToPath,
} from "../../shared/path.js"
import {
  extractUrls,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginEntryBuild(opts) {
  const cwd = process.cwd()
  const names = ["entry", "build"]
  const pluginName = getPluginName(names)
  const regImg = /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {{[before: string]: string}} */
  let entryChanges = {}
  /** @type {{[before: string]: string[]}} */
  let importedCssMap = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")

      if (isSsr) return

      const ssgFiles = await glob(path.resolve(ssgDir, `*.mjs`))

      if (!ssgFiles.length) return

      ssgPages = (
        await Promise.all(
          ssgFiles.map(async (file) => {
            const { ssgPages } = await import(path.resolve(cwd, file))
            return ssgPages
          })
        )
      ).flat()

      /** @type {string[]} */
      let assetNames = []
      /** @type {{ [pathId: string]: string }} */
      let preEntries = {}

      for (const ssgPage of ssgPages) {
        const { html } = ssgPage
        assetNames = [
          ...assetNames,
          ...extractUrls(html, "link", "href", "/"),
          ...extractUrls(html, "script", "src", "/"),
          ...extractUrls(html, "img", "src", "/"),
          ...extractUrls(html, "img", "srcset", "/"),
          ...extractUrls(html, "source", "srcset", "/"),
          ...extractUrls(html, "use", "href", "/"),
        ]
      }
      assetNames = [...new Set(assetNames)].map((url) => url.replace(/^\//, ""))

      for (const assetName of assetNames) {
        const pathId = pathToId(assetName)
        const fullPath = path.resolve(rootDir, assetName)
        preEntries[pathId] = fullPath
      }

      const checks = await Promise.all(
        Object.entries(preEntries).map(async ([key, value]) => {
          try {
            await fs.promises.access(value)
            return [key, value]
          } catch {
            return null
          }
        })
      )
      for (const pair of checks) {
        if (pair) entries[pair[0]] = pair[1]
      }

      return {
        build: {
          rollupOptions: {
            input: {
              ...entries,
            },
          },
        },
      }
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)
      const entryIds = Object.keys(entries)

      if (entryIds.length === 0) return

      for (const entryId of entryIds) {
        const before = idToPath(entryId)

        for (const item of Object.values(outputChunks)) {
          if (item.name !== entryId) continue
          if (!item.code.trim()) continue

          const name = path.parse(before).name
          const newFileName = item.fileName.replace(entryId, name)

          item.fileName = newFileName
          entryChanges[before] = newFileName

          let importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          importedCssFiles = importedCssFiles.map((file) => {
            const fileName = file.replace(entryId, name)
            outputAssets[file].fileName = fileName
            return fileName
          })
          if (importedCssFiles.length > 0) {
            importedCssMap[before] = importedCssFiles
          }
          break
        }

        for (const item of Object.values(outputAssets)) {
          if (!item.originalFileNames.includes(before)) continue

          const name = path.parse(before).name
          const newFileName = item.fileName.replace(entryId, name)

          item.fileName = newFileName
          entryChanges[before] = newFileName
          break
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })

      for (const item of htmlItems) {
        const htmlName = item.fileName
        let newHtml = String(item.source)

        for (const [before, after] of Object.entries(entryChanges)) {
          const basedAssetUrl = getBasedAssetUrl(base, htmlName, after)
          const regExp = new RegExp(`(<[^>]*?)/${before}([^>]*?>)`, "gs")
          newHtml = newHtml.replace(regExp, `$1${basedAssetUrl}$2`)

          if (!Object.hasOwn(importedCssMap, before)) continue

          for (const file of importedCssMap[before]) {
            const cssBasedAssetUrl = getBasedAssetUrl(base, htmlName, file)
            const linkTag = `<link rel="stylesheet" href="${cssBasedAssetUrl}">`
            newHtml = newHtml.replace("</head>", `${linkTag}</head>`)
          }
        }
        item.source = newHtml
      }
    },
  }
}
