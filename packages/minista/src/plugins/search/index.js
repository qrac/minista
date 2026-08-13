/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../../features/ssg/index.js').RenderedPage} RenderedPage */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { getSearchData } from "./utils/data.js"
import { NodeSearchDocumentAnalyzer } from "../../adapters/html/index.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { processViteDocuments } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  createSearchFeature,
  createSearchDataArtifactId,
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

  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))

  /** @param {import("vite").Environment | undefined} environment */
  function getOutputClaims(environment) {
    return claimStates.get(environment).claims
  }

  return {
    name: "vite-plugin:minista-search",
    api: { minista: { outputClaims: getOutputClaims, feature: { id: "search", apiVersion: 1, options: opts, provides: ["search-data"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      const isAppBuild = Boolean(getViteAppEnvironmentNames(config))
      return command === "serve" ||
        (command === "build" && (isAppBuild || !isSsrBuild))
    },
    config: async (config, { command, isSsrBuild }) => {
      if (command === "serve") {
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
        }
      }
      if (
        command === "build" &&
        !getViteAppEnvironmentNames(config) &&
        isSsrBuild
      ) {
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
          /** @type {{default?: RenderedPage[]}} */
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
      const environment = this.environment
      const appEnvironmentNames = getViteAppEnvironmentNames(
        environment.getTopLevelConfig(),
      )
      const isDev = environment.config.command === "serve"
      const isAppClient = Boolean(appEnvironmentNames) &&
        environment.name === appEnvironmentNames?.clientName
      const isLegacyClient = !appEnvironmentNames &&
        environment.config.command === "build" &&
        !environment.config.build.ssr

      let newCode = code

      const regBase = /(const base = )"\/"/
      const regApply = /(const apply = )"serve"/
      const regRelativeAttr = /(const relativeAttr = )"data-search-relative"/
      const regInputAttr = /(const inputAttr = )"data-search-input"/

      if (isDev) {
        const base = getServeBase(environment.config.base || "/")
        newCode = newCode.replace(regBase, `$1"${base}"`)
      }
      if (isLegacyClient || isAppClient) {
        newCode = newCode.replace(regApply, `$1"build"`)
        newCode = newCode.replace(regRelativeAttr, `$1"${opts.relativeAttr}"`)
      }
      newCode = newCode.replace(regInputAttr, `$1"${opts.inputAttr}"`)
      return newCode
    },
    async generateBundle(options, bundle) {
      const appEnvironmentNames = getViteAppEnvironmentNames(
        this.environment.getTopLevelConfig(),
      )
      if (
        this.environment.config.build.ssr ||
        (appEnvironmentNames &&
          this.environment.name !== appEnvironmentNames.clientName)
      ) return
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
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
          html: String(item.source),
        }
      })
      const result = await processViteDocuments(
        renderedPages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [createSearchFeature(opts, analyzer)],
      )
      const searchArtifact = result.artifacts.find(
        ({ id }) => id === createSearchDataArtifactId(opts.outName),
      )
      if (!searchArtifact) {
        throw new Error("Search lifecycle did not generate search data.")
      }
      /** @type {import("../../features/search/index.js").SearchData} */
      const searchData = JSON.parse(String(searchArtifact.content))
      const outputPageUrls = searchData.pages.map(({ url }) => url)
      const referenceId = this.emitFile({
        type: "asset",
        name: `${opts.outName}.json`,
        source: JSON.stringify(searchData),
      })
      const after = this.getFileName(referenceId)
      outputClaims.push(Object.freeze({
        id: createSearchDataArtifactId(opts.outName),
        kind: /** @type {const} */ ("data"),
        owner: createNodeId("feature", "search"),
        source: "search-data",
        fileName: after,
        pageUrls: Object.freeze(outputPageUrls),
        dependencies: Object.freeze([]),
      }))

      const fetchItems = Object.values(outputChunks).filter((item) => {
        return item.moduleIds.includes(cpSearchPath)
      })
      for (const item of fetchItems) {
        const beforeFetch = "/@__minista_search_json"
        item.code = item.code.replace(beforeFetch, after)
      }

      const outputDocuments = new Map(
        result.documents.map((document) => [document.fileName, document]),
      )
      for (const page of renderedPages) {
        const output = outputDocuments.get(page.fileName)
        if (output && output.html !== page.html) page.item.source = output.html
      }
    },
  }
}
