import fs from "node:fs"
import path from "node:path"

import { getGlobImportCode } from "./code.js"

import { getPluginName, getTempName } from "../../utils/name.js"
import { getRootDir, getTempDir, pathToId, idToPath } from "../../utils/path.js"
import { extractUrls, getBasedAssetUrl } from "../../utils/url.js"
import { searchFiles } from "../../utils/file.js"
import { filterOutputAssets, filterOutputChunks } from "../../utils/vite.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../../plugins/ssg/types').SsgPage} SsgPage */

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginBundleBuild(opts) {
  const cwd = process.cwd()
  const names = ["bundle", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  /** @type {{ [key: string]: string }} */
  let entries = {}
  /** @type {{ before: string; after: string }[]} */
  let entryChanges = []

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
      if (isSsr) return

      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.join(tempDir, "glob")
      globFile = path.join(globDir, `${tempName}.js`)
      ssgDir = path.join(tempDir, "ssg")

      const ssgFiles = await searchFiles(path.join(ssgDir, `*.mjs`))

      if (!ssgFiles.length) return

      ssgPages = (
        await Promise.all(
          ssgFiles.map(async (file) => {
            const { ssgPages } = await import(file)
            return ssgPages
          })
        )
      ).flat()

      /** @type {{ [key: string]: string }} */
      let preEntries = {}

      for (const ssgPage of ssgPages) {
        const { html } = ssgPage
        const assetUrls = [
          ...extractUrls(html, "link", "href", "/"),
          ...extractUrls(html, "script", "src", "/"),
          ...extractUrls(html, "img", "src", "/"),
          ...extractUrls(html, "img", "srcset", "/"),
          ...extractUrls(html, "source", "srcset", "/"),
          ...extractUrls(html, "use", "href", "/"),
        ]
        for (const assetUrl of assetUrls) {
          const entryId = pathToId(assetUrl.replace(/^\/+/, ""))
          const fullPath = path.join(rootDir, assetUrl.replace(/^\/+/, ""))
          preEntries[entryId] = fullPath
        }
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

      const code = getGlobImportCode(opts)
      await fs.promises.mkdir(globDir, { recursive: true })
      await fs.promises.writeFile(globFile, code, "utf8")

      return {
        build: {
          rollupOptions: {
            input: {
              ...entries,
              [tempName]: globFile,
            },
          },
        },
      }
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      let hasBundle = false
      let bundleName = ""

      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)
      const entryIds = Object.keys(entries)
      const entryPaths = Object.keys(entries).map((key) => idToPath(key))
      const regImg = /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i

      for (const [key, item] of Object.entries(outputAssets)) {
        if (item.names.some((name) => name === `${tempName}.css`)) {
          hasBundle = true
          bundleName = item.fileName.replace(tempName, opts.outName)
          bundle[key].fileName = bundleName
          continue
        }
        const fromEntryPath = item.originalFileNames.find((name) =>
          entryPaths.some((entryPath) => entryPath === name)
        )
        if (fromEntryPath) {
          const newName = path.parse(fromEntryPath).name
          const entryId = pathToId(fromEntryPath)
          const newFileName = item.fileName.replace(entryId, newName)
          bundle[key].fileName = newFileName
          entryChanges.push({
            before: fromEntryPath,
            after: newFileName,
          })
          continue
        }
      }

      for (const [key, item] of Object.entries(outputChunks)) {
        if (item.name === tempName) {
          delete bundle[key]
          continue
        }
        if (entryIds.includes(item.name) && item.code.trim()) {
          const newName = path.parse(entries[item.name]).name
          const newFileName = item.fileName.replace(item.name, newName)
          bundle[key].fileName = newFileName
          entryChanges.push({
            before: idToPath(item.name),
            after: newFileName,
          })
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })
      const afterMap = new Set(entryChanges.map((item) => item.after))
      const otherImgItems = Object.values(outputAssets).filter((item) => {
        return regImg.test(item.fileName) && !afterMap.has(item.fileName)
      })

      for (const item of htmlItems) {
        const outputHtmlPath = item.fileName
        let newHtml = String(item.source)

        if (hasBundle) {
          const basedAssetUrl = getBasedAssetUrl(
            base,
            outputHtmlPath,
            bundleName
          )
          const linkTag = `<link rel="stylesheet" href="${basedAssetUrl}">`
          newHtml = newHtml.replace("</head>", `${linkTag}</head>`)
        }

        if (entryChanges.length > 0) {
          for (const change of entryChanges) {
            const { before, after } = change
            const basedAssetUrl = getBasedAssetUrl(base, outputHtmlPath, after)
            const regExp = new RegExp(`(<[^>]*?)/${before}([^>]*?>)`, "gs")
            newHtml = newHtml.replace(regExp, `$1${basedAssetUrl}$2`)
          }
        }

        if (base === "./") {
          for (const item of otherImgItems) {
            const before = item.fileName
            const after = item.fileName
            const basedAssetUrl = getBasedAssetUrl(base, outputHtmlPath, after)
            const regExp = new RegExp(`(<[^>]*?)/${before}([^>]*?>)`, "gs")
            newHtml = newHtml.replace(regExp, `$1${basedAssetUrl}$2`)
          }
        }
        item.source = newHtml
      }
    },
  }
}
