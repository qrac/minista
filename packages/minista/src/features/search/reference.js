// @ts-check

// Shared by the feature, its facade and the browser component. No platform APIs.
export class SearchIndexError extends Error {
  /** @param {import("../../core/diagnostics/index.js").DiagnosticCode} code @param {string} message */
  constructor(code, message) {
    super(`[${code}] ${message}`)
    this.name = "SearchIndexError"
    this.code = code
    this.diagnostic = Object.freeze({
      code, severity: /** @type {const} */ ("error"), message, feature: "feature:search",
    })
  }
}

/**
 * @template {{name?: string | null}} T
 * @param {readonly T[]} indexes
 * @param {string | undefined} name
 * @param {boolean} multiIndex
 * @returns {T}
 */
export function resolveSearchIndex(indexes, name, multiIndex) {
  const available = indexes.map((index) => index.name).join(", ")
  if (multiIndex && name === undefined) {
    throw new SearchIndexError("MINISTA_SEARCH_INDEX_REQUIRED",
      `Search index is required when pluginSearch() defines indexes. Available indexes: ${available}.`)
  }
  const index = multiIndex
    ? indexes.find((index) => index.name === name)
    : name === undefined ? indexes[0] : undefined
  if (!index) {
    throw new SearchIndexError("MINISTA_SEARCH_INDEX_UNKNOWN",
      `Unknown Search index ${JSON.stringify(name)}. ${multiIndex ? `Available indexes: ${available}.` : "Omit index in single-index mode."}`)
  }
  return index
}
