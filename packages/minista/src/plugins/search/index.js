/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { getSearchData } from "./utils/data.js"
import {
  NodeHtmlDocumentFactory,
  NodeSearchDocumentAnalyzer,
} from "../../adapters/html/index.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  analyzeRenderedSearchPages,
  composeSearchOutputDocument,
  getSearchPageUrl,
} from "../../features/search/index.js"
import { mergeObj } from "../../shared/obj.js"
import { getServeBase } from "../../shared/url.js"
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
const documents = new NodeHtmlDocumentFactory()
const analyzer = new NodeSearchDocumentAnalyzer()

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSearch(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cpSearchPath = normalizePath(
    path.resolve(__dirname, "components/search.js"),
  )

  let isDev = false
  let isSsr = false
  let isBuild = false
  let isAppBuild = false
  /** @type {Required<import("../../adapters/vite/app-config.js").ViteAppEnvironmentNames> | undefined} */
  let appEnvironmentNames

  let base = "/"
  let after = ""

  return {
    name: "vite-plugin:minista-search",
    api: { minista: { feature: { id: "search", apiVersion: 1, options: opts, provides: ["search-data"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      isDev = command === "serve"
      appEnvironmentNames = getViteAppEnvironmentNames(config)
      isAppBuild = command === "build" && Boolean(appEnvironmentNames)
      isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      isBuild = command === "build" && !isAppBuild && !isSsrBuild
      return isDev || isAppBuild || isBuild
    },
    config: async (config) => {
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
    },
    configureServer(server) {
      /** @type {ViteDevModuleEvaluator | undefined} */
      let evaluator
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/@__minista_search_json") {
          evaluator ??= new ViteDevModuleEvaluator(server)
          /** @type {{default?: SsgPage[]}} */
          const mod = await evaluator.importModule("virtual:ssg-pages")
          const ssgPages = mod.default ?? []
          const searchData = await getSearchData(ssgPages, opts)

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
      const isAppClient =
        isAppBuild &&
        this.environment.name === appEnvironmentNames?.clientName
      if (isBuild || isAppClient) {
        newCode = newCode.replace(regApply, `$1"build"`)
        newCode = newCode.replace(regRelativeAttr, `$1"${opts.relativeAttr}"`)
      }
      newCode = newCode.replace(regInputAttr, `$1"${opts.inputAttr}"`)
      return newCode
    },
    async generateBundle(options, bundle) {
      if (
        isAppBuild &&
        this.environment.name !== appEnvironmentNames?.clientName
      ) return
      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)

      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      const renderedPages = htmlItems.map((item) => {
        const url = getSearchPageUrl(item.fileName)
        return {
          url,
          fileName: item.fileName,
          item,
          document: documents.parse({
            pageId: createNodeId("page", "legacy-search", url),
            html: String(item.source),
          }),
        }
      })
      const searchData = await analyzeRenderedSearchPages(
        renderedPages,
        opts,
        analyzer,
      )
      const referenceId = this.emitFile({
        type: "asset",
        name: `${opts.outName}.json`,
        source: JSON.stringify(searchData),
      })
      after = this.getFileName(referenceId)

      const fetchItems = Object.values(outputChunks).filter((item) => {
        return item.moduleIds.includes(cpSearchPath)
      })
      for (const item of fetchItems) {
        const beforeFetch = "/@__minista_search_json"
        item.code = item.code.replace(beforeFetch, after)
      }

      for (const page of renderedPages) {
        if (composeSearchOutputDocument(page.document, page.url, opts) > 0) {
          page.item.source = page.document.serialize()
        }
      }
    },
  }
}
