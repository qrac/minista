// @ts-check

/** @typedef {import('../types').SearchData} SearchData */
/** @typedef {import('../types').SearchPage} SearchPage */
/** @typedef {import('../types').SearchResult} SearchResult */

/** @param {string} value */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * @param {string[]} tokens
 * @returns {string}
 */
function joinTokens(tokens) {
  let out = ""
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i] ?? ""
    const prev = tokens[i - 1] ?? ""
    const needSpace =
      prev && cur && /[0-9A-Za-z]$/.test(prev) && /^[0-9A-Za-z]/.test(cur)

    out += (needSpace ? " " : "") + cur
  }
  return out
}

/** @param {SearchData} searchData */
export function prepareSearchQuery(searchData) {
  return {
    searchData,
    wordIndexes: new Map(searchData.words.map((word, index) => [word, index])),
    searchHits: searchData.hits.map((hit) => searchData.words[hit]),
    searchPages: searchData.pages.map((page) => ({
      url: page.url,
      title: [...new Set(page.title)].sort((a, b) => a - b),
      toc: page.toc,
      content: [...new Set(page.content)].sort((a, b) => a - b),
    })),
  }
}

/**
 * @param {ReturnType<typeof prepareSearchQuery>} prepared
 * @param {string} inputValue
 * @param {{ minHitLength?: number, maxHitPages?: number, maxHitWords?: number }} options
 */
export function querySearch(prepared, inputValue, options = {}) {
  const { searchData, searchHits, searchPages, wordIndexes } = prepared
  const { minHitLength = 2, maxHitPages = 5, maxHitWords = 20 } = options
  const input = inputValue || ""
  const inputValues = input.split(" ").filter(Boolean)
  const mergedInputValues = [...new Set(inputValues)].sort()

  const hitValues = mergedInputValues.flatMap((value) =>
    value.length >= minHitLength
      ? searchHits.filter((hit) =>
          new RegExp(escapeRegExp(value), "i").test(hit),
        )
      : [],
  )
  const mergedHitValues = [...new Set(hitValues)].sort()
  const hitIndexes = mergedHitValues.map((value) =>
    wordIndexes.get(value) ?? -1,
  )

  /** @type {SearchPage[]} */
  const hitPages = searchPages.flatMap((page) => {
    const titleIndexs = page.title.filter((i) => hitIndexes.indexOf(i) !== -1)
    const contentIndexs = page.content.filter(
      (i) => hitIndexes.indexOf(i) !== -1,
    )
    if (titleIndexs.length || contentIndexs.length) {
      return {
        url: page.url,
        title: titleIndexs,
        toc: page.toc,
        content: contentIndexs,
      }
    } else {
      return []
    }
  })

  const sortedHitPages = [...new Set(hitPages)]
    .sort((a, b) => {
      if (a.title.length !== b.title.length)
        return (a.title.length - b.title.length) * -1
      if (a.content.length !== b.content.length)
        return (a.content.length - b.content.length) * -1
      return 0
    })
    .slice(0, maxHitPages)

  const resultHitPages = sortedHitPages
    .map((page) => {
      const targetPage = searchData.pages.find(
        (dataPage) => dataPage.url === page.url,
      )
      if (!targetPage) return null
      if (page.title.length) {
        const targetContent = targetPage?.title
          .map((num) => searchData.words[num])
          .join(" ")
        return { url: targetPage.url, content: targetContent }
      } else {
        const targetWord = page.content[0]
        const targetIndex = targetPage.content.indexOf(targetWord)
        const targetIndexes = targetPage.content.slice(
          targetIndex,
          targetIndex + maxHitWords,
        )
        const targetWords = joinTokens(
          targetIndexes.map((num) => searchData.words[num]),
        )
        const targetContent = "..." + targetWords + "..."
        const targetId = () => {
          if (!page.toc.length) return ""
          const targetToc = page.toc
            .filter((item) => targetIndex >= item[0])
            .slice(-1)[0]
          return targetToc ? "#" + targetToc[1] : ""
        }
        return { url: targetPage.url + targetId(), content: targetContent }
      }
    })
    .filter(
      /**
       * @param {SearchResult | null} file
       * @returns {file is SearchResult}
       */
      (file) => Boolean(file),
    )

  return { values: mergedInputValues, hitValues: mergedHitValues, results: resultHitPages }
}
