// @ts-check

/** @typedef {import("./search.js").SearchPageAnalysis} SearchPageAnalysis */
/** @typedef {import("./search.js").SearchFeatureOptions} SearchFeatureOptions */
/** @typedef {import("./search.js").SearchData} SearchData */

/**
 * @param {readonly SearchPageAnalysis[]} analyses
 * @param {SearchFeatureOptions["hit"]} hit
 * @returns {SearchData}
 */
export function createSearchData(analyses, hit) {
  const words = [...new Set(analyses.flatMap((page) => page.words))].sort()
  const wordIndexes = new Map(words.map((word, index) => [word, index]))
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
    .map((word) => wordIndexes.get(word) ?? -1)
  /** @type {SearchData["pages"][number][]} */
  const pages = analyses
    .map((page) => ({
      url: page.url,
      title: page.title.map((word) => wordIndexes.get(word) ?? -1),
      toc: page.toc.map(
        ([index, id]) => /** @type {const} */ ([index, id]),
      ),
      content: page.content.map((word) => wordIndexes.get(word) ?? -1),
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

