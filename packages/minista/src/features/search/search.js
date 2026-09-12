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
/** @typedef {import("./search.js").SearchFeatureConfig} SearchFeatureConfig */
/** @typedef {import("./search.js").SearchIndexOptions} SearchIndexOptions */
/** @typedef {import("./search.js").SearchPageAnalysis} SearchPageAnalysis */

export const SEARCH_FEATURE_ID = createNodeId("feature", "search")

/**
 * @param {SearchFeatureConfig} options
 * @returns {Omit<import("../../core/lifecycle/index.js").MinistaFeature<SearchFeatureConfig>, "hooks">}
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

/** @param {SearchFeatureConfig} options @returns {readonly SearchIndexOptions[]} */
export function getSearchIndexes(options) {
  return "indexes" in options ? options.indexes : [options]
}

/** @param {string} pageId @param {string} [groupName] */
function createSearchAnalysisArtifactId(pageId, groupName) {
  return createNodeId("artifact", groupName === undefined ? "search-analysis" : `search-analysis/${groupName}`, pageId)
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
 * @param {SearchFeatureConfig} options
 * @param {SearchDocumentAnalyzer} analyzer
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<SearchFeatureConfig>}
 */
export function createSearchFeature(options, analyzer) {
  const indexes = getSearchIndexes(options)
  const multiIndex = "indexes" in options
  // Only extraction options affect document analysis. Selection and hit filters
  // remain independent, so overlapping indexes can share one page artifact.
  /** @type {Map<string, SearchIndexOptions[]>} */
  const groups = new Map()
  for (const index of [...indexes].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))) {
    const key = JSON.stringify([index.trimTitle, index.targetSelector, index.ignoreSelectors])
    const group = groups.get(key) ?? []
    group.push(index)
    groups.set(key, group)
  }
  return Object.freeze({
    ...createSearchFeatureDescriptor(options),
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const page = context.graph.getPage(document.pageId)
          if (!page) continue
          const fileName = getSearchPageFileName(page.url)
          for (const group of groups.values()) {
            const selected = group.filter((index) => picomatch.isMatch(fileName, [...index.src], {
              ignore: [...index.ignore],
            }))
            const first = selected[0]
            if (!first) continue
            const analysis = await analyzer.analyze(document, first)
            const record = {
              ...analysis,
              url: page.url,
              ...(multiIndex ? { indexes: selected.map((index) => index.name) } : {}),
            }
            const id = createSearchAnalysisArtifactId(page.id, multiIndex ? group[0]?.name : undefined)
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
        }
      },
      /** @param {PhaseContext} context */
      async generate(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === SEARCH_FEATURE_ID &&
            record.mediaType === "application/vnd.minista.search-page+json",
        )
        const parsed = records.map((record) => ({
          id: record.id,
          analysis: /** @type {SearchPageAnalysis & {indexes?: string[]}} */ (JSON.parse(String(record.content))),
        }))
        for (const index of indexes) {
          const selected = parsed.filter(({ analysis }) => !multiIndex || analysis.indexes?.includes(index.name ?? ""))
          const id = createSearchDataArtifactId(index.outName)
          const data = {
            // Named data remains identifiable even when two indexes have the
            // same pages (or are empty). Bundlers must not deduplicate them.
            ...(multiIndex ? { index: index.name } : {}),
            ...createSearchData(selected.map(({ analysis }) => analysis), index.hit),
          }
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
              source: `search:${index.name ?? index.outName}`,
              dependencies: selected.map(({ id: dependency }) => dependency),
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      compose(context) {
        for (const document of context.documents.list()) {
          for (const index of indexes) {
            composeSearchDocument(
              document,
              context.graph.getPage(document.pageId),
              index,
            )
          }
        }
      },
    }),
  })
}
