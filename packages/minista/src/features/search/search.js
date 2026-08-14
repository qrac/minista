// @ts-check

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
 * @param {readonly SearchPageAnalysis[]} analyses
 * @param {SearchFeatureOptions["hit"]} hit
 * @returns {SearchData}
 */
export function createSearchData(analyses, hit) {
  const words = [...new Set(analyses.flatMap((page) => page.words))].sort()
  const patterns = [
    hit.number && "[0-9]",
    hit.english && "[a-zA-Z]",
    hit.hiragana && "[ぁ-ん]",
    hit.katakana && "[ァ-ヴ]",
    hit.kanji &&
      "[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FC3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9]",
  ].filter(Boolean)
  const hitPattern = new RegExp(`(${patterns.join("|")})`)
  const hits = words
    .filter(
      (word) =>
        word.length >= hit.minLength && hitPattern.test(word) && word !== "...",
    )
    .map((word) => words.indexOf(word))
  /** @type {SearchData["pages"][number][]} */
  const pages = analyses
    .map((page) => ({
      url: page.url,
      title: page.title.map((word) => words.indexOf(word)),
      toc: page.toc.map(
        ([index, id]) => /** @type {const} */ ([index, id]),
      ),
      content: page.content.map((word) => words.indexOf(word)),
    }))
    .sort((left, right) =>
      left.url.localeCompare(right.url, "en", { sensitivity: "base" }),
    )

  return Object.freeze({
    words: Object.freeze(words),
    hits: Object.freeze(hits),
    pages: Object.freeze(pages),
  })
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
    id: SEARCH_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("search-data")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        const pages = context.graph.snapshot().pages
        for (const document of context.documents.list()) {
          const page = pages.get(document.pageId)
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
          if (context.graph.snapshot().features.has(SEARCH_FEATURE_ID)) {
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
        if (context.graph.snapshot().features.has(SEARCH_FEATURE_ID)) {
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
        const pages = context.graph.snapshot().pages
        for (const document of context.documents.list()) {
          composeSearchDocument(document, pages.get(document.pageId), options)
        }
      },
    }),
  })
}
