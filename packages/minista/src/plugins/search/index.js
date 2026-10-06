import { registerViteFeatureLifecycle, runViteDevLifecycle, transformViteDocumentContent } from "../../adapters/vite/feature-lifecycle.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../../features/ssg/index.js').RenderedPage} RenderedPage */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { NodeSearchDocumentAnalyzer } from "../../adapters/html/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import {
  createViteCompatibilityTraceHooks,
  processViteDocuments,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  createSearchFeature,
  createSearchFeatureDescriptor,
  createSearchDataArtifactId,
  getSearchPageUrl,
  getSearchIndexes,
} from "../../features/search/index.js"
import { resolveSearchIndex } from "../../features/search/reference.js"
import { resolveSearchOptions } from "./internal/options.js"
export { defaultOptions } from "./internal/options.js"
import { getServeBase } from "../../shared/url.js"
import {
  mergeSsrNoExternal,
  filterOutputAssets,
  filterOutputChunks,
} from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const analyzer = new NodeSearchDocumentAnalyzer()
const devEndpoint = "/@__minista_search_json"

/** @param {string | undefined} name */
function getSearchEndpoint(name) {
  return name === undefined ? devEndpoint : `${devEndpoint}?index=${encodeURIComponent(name)}`
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSearch(uOpts = {}) {
  const opts = resolveSearchOptions(uOpts)
  const indexes = getSearchIndexes(opts)
  const multiIndex = "indexes" in opts
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

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-search",
    api: { minista: { outputClaims: getOutputClaims, feature: createSearchFeatureDescriptor(opts) } },
    enforce: "pre",
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
      const basePath = new URL(getServeBase(server.config.base), "http://minista.local").pathname.replace(/\/$/, "")
      /** @type {ViteDevModuleEvaluator | undefined} */
      let evaluator
      /** @type {{pages: import("../../adapters/vite/compatibility-lifecycle.js").ViteCompatibilityDocumentInput[], result: import("../../adapters/vite/compatibility-lifecycle.js").ViteCompatibilityDocumentResult} | undefined} */
      let snapshot
      server.middlewares.use(async (req, res, next) => {
        const request = new URL(req.url ?? "/", "http://minista.local")
        if (request.pathname !== devEndpoint && request.pathname !== `${basePath}${devEndpoint}`) {
          next()
          return
        }
        try {
          const index = resolveSearchIndex(indexes, request.searchParams.get("index") ?? undefined, multiIndex)
          evaluator ??= new ViteDevModuleEvaluator(server)
          /** @type {{default?: RenderedPage[]}} */
          const mod = await evaluator.importModule("virtual:ssg-pages")
          const ssgPages = mod.default ?? []
          const result = await runViteDevLifecycle(server, async () => {
            const pages = []
            for (const { url, html } of ssgPages) {
              pages.push({
                // Dev document identity is its URL, shared with asset features.
                fileName: url,
                url,
                html: await transformViteDocumentContent(html, {
                  path: url, filename: path.resolve(server.config.root, url.replace(/^\//, "")), server,
                }),
              })
            }
            // All indexes belong to one transformed page snapshot. Consecutive
            // requests reuse its artifacts; edits/deletions change the inputs.
            if (snapshot && pages.length === snapshot.pages.length && pages.every((page, i) => {
              const previous = snapshot?.pages[i]
              return previous?.url === page.url && previous.html === page.html
            })) return snapshot.result
            const result = await processViteDocuments(
              pages,
              [createSearchFeature(opts, analyzer)],
              ["analyze", "generate"],
              createViteCompatibilityTraceHooks(
                getViteBuildSession(server.config),
                "search:dev",
              ),
            )
            snapshot = { pages, result }
            return result
          })
          const searchArtifact = result.artifacts.find(
            ({ id }) => id === createSearchDataArtifactId(index.outName),
          )
          if (!searchArtifact) {
            throw new Error("Search lifecycle did not generate search data.")
          }
          /** @type {import("../../features/search/index.js").SearchData} */
          const searchData = JSON.parse(String(searchArtifact.content))

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(searchData))
          return
        } catch (error) {
          next(error)
        }
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

      if (isDev) {
        const base = getServeBase(environment.config.base || "/")
        newCode = newCode.replace(regBase, (_, prefix) => prefix + JSON.stringify(base))
      }
      if (isLegacyClient || isAppClient) {
        newCode = newCode.replace(regApply, `$1"build"`)
      }
      // The same reference table validates SSR and browser renders, including
      // the legacy render build. Final asset names are resolved in generateBundle.
      const searchConfig = {
        multiIndex,
        indexes: indexes.map((index) => ({
          name: index.name ?? null,
          filePath: getSearchEndpoint(index.name),
          relativeAttr: index.relativeAttr,
          inputAttr: index.inputAttr,
        })),
      }
      newCode = newCode.replace(/^const searchConfig = .*$/m, () => `const searchConfig = ${JSON.stringify(searchConfig)}`)
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
        undefined,
        createViteCompatibilityTraceHooks(
          getViteBuildSession(this.environment.getTopLevelConfig()),
          "search:build",
        ),
      )
      for (const index of indexes) {
        const searchArtifact = result.artifacts.find(
          ({ id }) => id === createSearchDataArtifactId(index.outName),
        )
        if (!searchArtifact) {
          throw new Error("Search lifecycle did not generate search data.")
        }
        /** @type {import("../../features/search/index.js").SearchData} */
        const searchData = JSON.parse(String(searchArtifact.content))
        const outputPageUrls = searchData.pages.map(({ url }) => url)
        const referenceId = this.emitFile({
          type: "asset",
          name: `${index.outName}.json`,
          source: JSON.stringify(searchData),
        })
        const after = this.getFileName(referenceId)
        outputClaims.push(Object.freeze({
          id: createSearchDataArtifactId(index.outName),
          kind: /** @type {const} */ ("data"),
          owner: createNodeId("feature", "search"),
          source: index.name === undefined ? "search-data" : `search:${index.name}`,
          fileName: after,
          pageUrls: Object.freeze(outputPageUrls),
          dependencies: Object.freeze([]),
        }))

        // Match complete literals, including quotes/templates chosen by a minifier.
        // Search may be moved into a shared chunk by the client bundler.
        const beforeFetch = getSearchEndpoint(index.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const reference = new RegExp("([\"'`])" + beforeFetch + "\\1", "g")
        for (const item of Object.values(outputChunks)) {
          item.code = item.code.replace(reference, () => JSON.stringify(after))
        }
      }

      const outputDocuments = new Map(
        result.documents.map((document) => [document.fileName, document]),
      )
      for (const page of renderedPages) {
        const output = outputDocuments.get(page.fileName)
        if (output && output.html !== page.html) page.item.source = output.html
      }
    },
  })
}
