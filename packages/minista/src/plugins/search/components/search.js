/** @typedef {import('../types').SearchData} SearchData */
/** @typedef {import('../types').SearchPage} SearchPage */
/** @typedef {import('../types').SearchResult} SearchResult */
/** @typedef {import('../types').SearchProps} SearchProps */

import { useState, useRef, useEffect, createElement, cloneElement } from "react"

/** @type {"serve"|"build"} */
const apply = "serve"
/** @type {string} */
const base = "/"
const relativeAttr = "data-search-relative"
const inputAttr = "data-search-input"

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

/**
 * @param {SearchProps} props
 */
export function Search(props) {
  const {
    className = "search",
    minHitLength = 2,
    maxHitPages = 5,
    maxHitWords = 20,
    attributes = {},
    field = {},
    list = {},
    ...wrapperRest
  } = props
  const {
    className: fieldClassName = "search-field",
    placeholder = "",
    beforeElement,
    afterElement,
    clearElement,
    attributes: fieldAttributes = {},
    ...fieldRest
  } = field
  const {
    className: listClassName = "search-list",
    showUrl = true,
    attributes: listAttributes = {},
    ...listRest
  } = list

  const [root, setRoot] = useState("/")
  const [callSearchData, setCallSearchData] = useState(false)

  const [inputValue, setInputValue] = useState("")

  /** @type {React.RefObject<HTMLInputElement|null>} */
  const inputRef = useRef(null)

  /** @type {SearchData} */
  const defaultSearchData = {
    words: [],
    hits: [],
    pages: [],
  }
  /** @type {string[]} */
  const defaultSearchHits = []
  /** @type {SearchPage[]} */
  const defaultSearchPages = []
  /** @type {string[]} */
  const defaultSearchValues = []
  /** @type {string[]} */
  const defaultSearchHitValues = []
  /** @type {SearchResult[]} */
  const defaultSearchResults = []

  const [searchData, setSearchData] = useState(defaultSearchData)
  const [searchHits, setSearchHits] = useState(defaultSearchHits)
  const [searchPages, setSearchPages] = useState(defaultSearchPages)
  const [searchValues, setSearchValues] = useState(defaultSearchValues)
  const [searchHitValues, setSearchHitValues] = useState(defaultSearchHitValues)
  const [searchResults, setSearchResults] = useState(defaultSearchResults)

  const checkValues = searchValues && searchValues.length
  const checkHitValues = searchHitValues && searchHitValues.length
  const checkResults = searchResults && searchResults.length

  /**
   * @param {string} nextValue
   */
  const runSearch = (nextValue) => {
    if (!callSearchData) setCallSearchData(true)
    if (!searchData || !searchHits || !searchPages) return

    const input = nextValue || ""
    const inputValues = input.split(" ").filter(Boolean)
    const mergedInputValues = [...new Set(inputValues)].sort()

    const hitValues = mergedInputValues.flatMap((value) =>
      value.length >= minHitLength
        ? searchHits.filter((hit) => new RegExp(value, "i").test(hit))
        : [],
    )
    const mergedHitValues = [...new Set(hitValues)].sort()
    const hitIndexes = mergedHitValues.map((value) =>
      searchData.words.indexOf(value),
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

    setSearchValues(
      mergedInputValues.filter((value) => value && !value.includes(" ")),
    )
    setSearchHitValues(mergedHitValues)
    setSearchResults(resultHitPages)
  }

  /**
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  const searchHandler = (event) => {
    const nextValue = event.target.value || ""
    setInputValue(nextValue)
    runSearch(nextValue)
  }

  const clearInput = () => {
    setInputValue("")
    setSearchValues([])
    setSearchHitValues([])
    setSearchResults([])
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const resolvedClearElement =
    clearElement && inputValue
      ? cloneElement(clearElement, {
          /**
           * @param {import("react").MouseEvent<HTMLElement>} e
           */
          onClick: (e) => {
            clearElement.props?.onClick?.(e)
            e?.preventDefault?.()
            clearInput()
          },
        })
      : null

  /**
   * @param {string} content
   * @returns {string | React.ReactElement[]}
   */
  function highlight(content) {
    if (!checkValues || !checkHitValues) return content
    const regValues = new RegExp(`(${searchValues.join("|")})`, "ig")
    const regHitValues = new RegExp(`(${searchHitValues.join("|")})`, "ig")
    const words = content.split(regHitValues)
    const filteredWords = words.filter((word) => word && word.length > 0)
    return filteredWords.map((word, wordIndex) => {
      if (word.match(regHitValues)) {
        const glyphs = word.split(regValues)
        return createElement(
          "span",
          { key: wordIndex },
          glyphs.map((glyph, glyphIndex) =>
            glyph.match(regValues)
              ? createElement("mark", { key: glyphIndex }, glyph)
              : createElement("span", { key: glyphIndex }, glyph),
          ),
        )
      } else {
        return createElement("span", { key: wordIndex }, word)
      }
    })
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function basedUrl(url) {
    if (apply === "build") {
      return root.replace(/\/+$/, "/") + url.replace(/^\/+/, "")
    }
    if (base === "/") return url
    if (base.startsWith("/")) {
      return base.replace(/\/+$/, "/") + url.replace(/^\/+/, "")
    }
    if (/^https?:\/\//.test(base)) {
      const fixedBase = new URL(base).pathname
      return fixedBase.replace(/\/+$/, "/") + url.replace(/^\/+/, "")
    }
    return url
  }

  useEffect(() => {
    if (!callSearchData) return

    const getSearchData = async () => {
      let filePath = "/@__minista_search_json"

      if (apply === "build") {
        const el = document.querySelector(`[${relativeAttr}]`)
        const distance = Number(el?.getAttribute(relativeAttr)) || 0
        const here = location.pathname
        let segments = here.split("/").filter(Boolean)
        distance > 0 && (segments = segments.slice(0, -distance))
        const newRoot = "/" + segments.join("/") + "/"
        filePath = newRoot.replace(/\/+$/, "/") + filePath
        setRoot(newRoot)
      }

      const response = await fetch(filePath)
      /** @type {SearchData} */
      const data = await response.json()
      setSearchData(data)

      if (data.words && data.hits) {
        const hitWords = data.hits.map((hit) => data.words[hit])
        setSearchHits(hitWords)
      }
      if (data.words && data.pages) {
        const optimizePages = data.pages.map((page) => ({
          url: page.url,
          title: [...new Set(page.title)].sort((a, b) => a - b),
          toc: page.toc,
          content: [...new Set(page.content)].sort((a, b) => a - b),
        }))
        setSearchPages(optimizePages)
      }
    }
    getSearchData()
  }, [callSearchData])

  return createElement(
    "div",
    {
      ...attributes,
      ...(className ? { className } : {}),
      ...wrapperRest,
    },
    createElement(
      "div",
      {
        ...fieldAttributes,
        ...(fieldClassName ? { className: fieldClassName } : {}),
        ...fieldRest,
      },
      beforeElement || null,
      createElement("input", {
        type: "search",
        placeholder,
        [inputAttr]: "",
        value: inputValue,
        onChange: searchHandler,
        ref: inputRef,
      }),
      resolvedClearElement,
      afterElement || null,
    ),

    checkResults
      ? createElement(
          "ul",
          {
            ...listAttributes,
            ...(listClassName ? { className: listClassName } : {}),
            ...listRest,
          },
          searchResults.map((item, index) => {
            const url = basedUrl(item.url)
            return createElement(
              "li",
              { key: index },
              createElement(
                "a",
                { href: url },
                createElement(
                  "div",
                  null,
                  createElement(
                    "p",
                    null,
                    createElement("strong", null, highlight(item.content)),
                  ),
                  showUrl
                    ? createElement(
                        "p",
                        null,
                        createElement("small", null, url),
                      )
                    : null,
                ),
              ),
            )
          }),
        )
      : null,
  )
}
