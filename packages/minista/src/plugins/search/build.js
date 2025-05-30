/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { getSearchData } from "./utils/data.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getBuildBase } from "../../shared/url.js"
import { filterOutputAssets, filterOutputChunks } from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSearchBuild(opts) {
  const cwd = process.cwd()
  const names = ["search", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const cpSearchPath = path.resolve(__dirname, "components/search.js")

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let searchDir = ""
  let searchFile = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    async config(config) {
      isSsr = !!config.build?.ssr
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")
      searchDir = path.resolve(tempDir, "search")
      searchFile = path.resolve(searchDir, `${tempName}.txt`)

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

      if (!ssgPages.length) return

      const fullPath = path.resolve(searchDir, searchFile)
      const searchData = getSearchData(ssgPages, opts)
      await fs.promises.mkdir(searchDir, { recursive: true })
      await fs.promises.writeFile(fullPath, JSON.stringify(searchData), "utf8")

      return {
        build: {
          rollupOptions: {
            input: {
              [tempName]: searchFile,
            },
          },
        },
      }
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      let before = normalizePath(path.relative(rootDir, searchFile))
      let after = ""

      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)

      const afterItem = Object.values(outputAssets).find((item) => {
        return item.originalFileNames.some((name) => name === before)
      })
      if (afterItem) {
        afterItem.fileName = afterItem.fileName.replace(tempName, opts.outName)
        afterItem.fileName = afterItem.fileName.replace(/\.txt$/, ".json")
        after = afterItem.fileName
      }

      const fetchItems = Object.values(outputChunks).filter((item) => {
        return item.moduleIds.includes(cpSearchPath)
      })
      for (const item of fetchItems) {
        const beforeFetch = "/@__minista_search_json"
        item.code = item.code.replace(beforeFetch, after)
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })
      for (const item of htmlItems) {
        const htmlName = item.fileName
        const html = String(item.source)

        let parsedHtml = parseHtml(html)
        const inputEl = parsedHtml.querySelector(`[${opts.inputAttr}]`)
        if (!inputEl) continue

        const slashCount = (htmlName.match(/\//g) || []).length
        const bodyEl = parsedHtml.querySelector("body")
        bodyEl.setAttribute(opts.relativeAttr, String(slashCount))

        item.source = parsedHtml.toString()
      }
    },
    transform(code, id) {
      if (![cpSearchPath].includes(id)) return

      let newCode = code

      const regApply = /(const apply = )"serve"/
      const relativeAttr = /(const relativeAttr = )"data-search-relative"/
      const inputAttr = /(const inputAttr = )"data-search-input"/

      newCode = newCode.replace(regApply, `$1"build"`)
      newCode = newCode.replace(relativeAttr, `$1"${opts.relativeAttr}"`)
      newCode = newCode.replace(inputAttr, `$1"${opts.inputAttr}"`)
      return newCode
    },
  }
}
