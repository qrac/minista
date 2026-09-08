// @ts-check

import { createSearchData } from "./create-search-data.js"
export { createSearchData } from "./create-search-data.js"

import picomatch from "picomatch"

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/graph/index.js").PageNode} PageNode */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./search.js").SearchData} SearchData */
/** @typedef {import("./search.js").SearchDocumentAnalyzer} SearchDocumentAnalyzer */
/** @typedef {import("./search.js").SearchFeatureOptions} SearchFeatureOptions */
/** @typedef {import("./search.js").SearchPageAnalysis} SearchPageAnalysis */

export const SEARCH_FEATURE_ID = createNodeId("feature", "search")

/**
 * @param {SearchFeatureOptions} options
 * @returns {Omit<import("../../core/lifecycle/index.js").MinistaFeature<SearchFeatureOptions>, "hooks">}
 */
export function createSearchFeatureDescriptor(options) {
  return Object.freeze({
    id: SEARCH_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("search-data")],
    optionalAfter: ["comment", "svg", "image", "sprite", "entry", "island"].map(
      (id) => createNodeId("feature", id),
    ),
  })
}

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {string} url */
export function getSearchPageFileName(url) {
  const normalized = url.endsWith("/") ? `${url}index.html` : `${url}.html`
  return normalized.replace(/^\//, "")
}

/** @param {string} fileName */
export function getSearchPageUrl(fileName) {
  const normalized = fileName.replace(/^\//, "")
  if (normalized === "index.html") return "/"
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`
  }
  return `/${normalized.replace(/\.html$/, "")}`
}

/** @param {string} outName */
export function createSearchDataArtifactId(outName) {
  return createNodeId("artifact", `search/${outName}.json`)
}

/** @param {string} pageId */
function createSearchAnalysisArtifactId(pageId) {
  return createNodeId("artifact", "search-analysis", pageId)
}

/**
 * @param {HtmlDocument} document
 * @param {PageNode | undefined} page
 * @param {SearchFeatureOptions} options
 * @returns {number}
 */
export function composeSearchDocument(document, page, options) {
  if (!page) return 0
  return composeSearchOutputDocument(document, page.url, options)
}

/**
 * @param {HtmlDocument} document
 * @param {string} url
 * @param {SearchFeatureOptions} options
 * @returns {number}
 */
export function composeSearchOutputDocument(document, url, options) {
  if (document.select(`[${options.inputAttr}]`).length === 0) return 0
  const body = document.select("body")[0]
  if (!body) return 0
  const fileName = getSearchPageFileName(url)
  const isIndex = fileName.split("/").pop() === "index.html"
  const level = (fileName.match(/\//g) ?? []).length + (isIndex ? 0 : 1)
  body.setAttribute(options.relativeAttr, String(level))
  return 1
}

/**
 * @param {SearchFeatureOptions} options
 * @param {SearchDocumentAnalyzer} analyzer
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<SearchFeatureOptions>}
 */
export function createSearchFeature(options, analyzer) {
  return Object.freeze({
    ...createSearchFeatureDescriptor(options),
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const page = context.graph.getPage(document.pageId)
          if (!page) continue
          const fileName = getSearchPageFileName(page.url)
          if (
            !picomatch.isMatch(fileName, [...options.src], {
              ignore: [...options.ignore],
            })
          ) {
            continue
          }
          const analysis = await analyzer.analyze(document, options)
          const record = {
            ...analysis,
            url: page.url,
          }
          const id = createSearchAnalysisArtifactId(page.id)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: SEARCH_FEATURE_ID,
            mediaType: "application/vnd.minista.search-page+json",
            content: JSON.stringify(record),
            scope: { kind: "page", pageId: page.id },
          })
          if (context.graph.hasFeature(SEARCH_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: SEARCH_FEATURE_ID,
              source: `page:${page.id}`,
              dependencies: [],
              scope: { kind: "page", pageId: page.id },
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async generate(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === SEARCH_FEATURE_ID &&
            record.mediaType === "application/vnd.minista.search-page+json",
        )
        /** @type {SearchPageAnalysis[]} */
        const analyses = records.map((record) =>
          JSON.parse(String(record.content)),
        )
        const id = createSearchDataArtifactId(options.outName)
        const data = createSearchData(analyses, options.hit)
        await context.artifacts.put({
          schemaVersion: "1",
          id,
          owner: SEARCH_FEATURE_ID,
          mediaType: "application/json",
          content: JSON.stringify(data),
        })
        if (context.graph.hasFeature(SEARCH_FEATURE_ID)) {
          context.graph.addArtifact({
            id,
            kind: "data",
            owner: SEARCH_FEATURE_ID,
            source: `search:${options.outName}`,
            dependencies: records.map(({ id: dependency }) => dependency),
          })
        }
      },
      /** @param {PhaseContext} context */
      compose(context) {
        for (const document of context.documents.list()) {
          composeSearchDocument(
            document,
            context.graph.getPage(document.pageId),
            options,
          )
        }
      },
    }),
  })
}
