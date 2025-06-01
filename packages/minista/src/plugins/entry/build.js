/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types.js').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"

import { getPluginName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  extractUrls,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import { regScript, regImage } from "../../shared/reg.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginEntryBuild(opts) {
  const cwd = process.cwd()
  const names = ["entry", "build"]
  const pluginName = getPluginName(names)

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
        const pathId = regScript.test(assetName)
          ? path.parse(assetName).name
          : assetName
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
        for (const item of Object.values(outputChunks)) {
          if (item.name !== entryId) continue
          if (!item.code.trim()) continue

          const before = normalizePath(
            path.relative(rootDir, item.facadeModuleId)
          )
          const newFileName = item.fileName
          entryChanges[before] = newFileName

          let importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          if (importedCssFiles.length > 0) {
            importedCssMap[before] = importedCssFiles
          }
          break
        }

        for (const item of Object.values(outputAssets)) {
          if (!item.originalFileNames.includes(entryId)) continue
          const newFileName = item.fileName
          entryChanges[entryId] = newFileName
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
