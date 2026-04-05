/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { getSearchData } from "./utils/data.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getServeBase, getBuildBase } from "../../shared/url.js"
import {
  mergeSsrNoExternal,
  filterOutputAssets,
  filterOutputChunks,
} from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {PluginOptions} */
export const defaultOptions = {
  outName: "search",
  src: ["**/*.html"],
  ignore: ["404.html"],
  trimTitle: "",
  targetSelector: "[data-search]",
  ignoreSelectors: [],
  relativeAttr: "data-search-relative",
  inputAttr: "data-search-input",
  hit: {
    minLength: 3,
    number: false,
    english: true,
    hiragana: false,
    katakana: true,
    kanji: true,
  },
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSearch(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()
  const cpSearchPath = normalizePath(
    path.resolve(__dirname, "components/search.js"),
  )

  let isDev = false
  let isSsr = false
  let isBuild = false

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let searchDir = ""
  let searchFile = ""
  let before = ""
  let after = ""

  return {
    name: "vite-plugin:minista-search",
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

      if (isDev) {
        base = getServeBase(config.base || base)
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
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
      if (isBuild) {
        base = getBuildBase(config.base || base)
        ssgDir = path.resolve(tempDir, "ssg")
        searchDir = path.resolve(tempDir, "search")
        searchFile = path.resolve(searchDir, `${opts.outName}.txt`)

        const ssgFiles = await glob("*.mjs", { cwd: ssgDir })
        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const ssgFileUrl = pathToFileURL(path.resolve(ssgDir, file)).href
              const { ssgPages } = await import(ssgFileUrl)
              return ssgPages
            }),
          )
        ).flat()

        if (!ssgPages.length) return

        const fullPath = path.resolve(searchDir, searchFile)
        const pathId = normalizePath(path.relative(rootDir, fullPath))
        const searchData = getSearchData(ssgPages, opts)
        await fs.promises.mkdir(searchDir, { recursive: true })
        await fs.promises.writeFile(
          fullPath,
          JSON.stringify(searchData),
          "utf8",
        )

        return {
          build: {
            rollupOptions: {
              input: {
                [pathId]: searchFile,
              },
            },
          },
        }
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/@__minista_search_json") {
          const mod = await server.ssrLoadModule("virtual:ssg-pages")
          /** @type {SsgPage[]} */
          const ssgPages = mod.default ?? mod
          const searchData = getSearchData(ssgPages, opts)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(searchData))
          return
        }
        next()
      })
    },
    transform(code, id) {
      if (![cpSearchPath].includes(id)) return

      let newCode = code

      const regBase = /(const base = )"\/"/
      const regApply = /(const apply = )"serve"/
      const regRelativeAttr = /(const relativeAttr = )"data-search-relative"/
      const regInputAttr = /(const inputAttr = )"data-search-input"/

      if (isDev) {
        newCode = newCode.replace(regBase, `$1"${base}"`)
      }
      if (isBuild) {
        newCode = newCode.replace(regApply, `$1"build"`)
        newCode = newCode.replace(regRelativeAttr, `$1"${opts.relativeAttr}"`)
      }
      newCode = newCode.replace(regInputAttr, `$1"${opts.inputAttr}"`)
      return newCode
    },
    generateBundle(options, bundle) {
      before = normalizePath(path.relative(rootDir, searchFile))

      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)

      const afterItem = Object.values(outputAssets).find((item) => {
        return item.originalFileNames.some((name) => name === before)
      })
      if (afterItem) {
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
        bodyEl?.setAttribute(opts.relativeAttr, String(slashCount))

        item.source = parsedHtml.toString()
      }
    },
    async writeBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)

      const afterItem = Object.values(outputAssets).find((item) => {
        return item.originalFileNames.some((name) => name === before)
      })
      if (afterItem) {
        const oldPath = path.resolve(options.dir || "", afterItem.fileName)
        const newPath = oldPath.replace(/\.txt$/, ".json")
        await fs.promises.rename(oldPath, newPath)
      }
    },
  }
}
