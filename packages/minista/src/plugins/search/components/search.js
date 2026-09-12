import { escapeRegExp, prepareSearchQuery, querySearch } from "../internal/query.js"
import { resolveSearchIndex } from "../../../features/search/reference.js"

/** @typedef {import('../types').SearchData} SearchData */
/** @typedef {import('../types').SearchPage} SearchPage */
/** @typedef {import('../types').SearchResult} SearchResult */
/** @typedef {import('../types').SearchProps} SearchProps */

import { useState, useRef, useEffect, createElement, cloneElement } from "react"

/** @type {"serve"|"build"} */
const apply = "serve"
/** @type {string} */
const base = "/"
/** @type {{multiIndex: boolean, indexes: {name: string | null, filePath: string, relativeAttr: string, inputAttr: string}[]}} */
const searchConfig = { multiIndex: false, indexes: [{ name: null, filePath: "/@__minista_search_json", relativeAttr: "data-search-relative", inputAttr: "data-search-input" }] }

/**
 * @param {SearchProps} props
 */
export function Search(props) {
  const {
    index,
    className = "search",
    minHitLength = 2,
    maxHitPages = 5,
    maxHitWords = 20,
    attributes = {},
    field = {},
    list = {},
    ...wrapperRest
  } = props
  const { filePath: searchFilePath, relativeAttr, inputAttr } = resolveSearchIndex(searchConfig.indexes, index, searchConfig.multiIndex)
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
  const defaultSearchValues = []
  /** @type {string[]} */
  const defaultSearchHitValues = []
  /** @type {SearchResult[]} */
  const defaultSearchResults = []

  const [preparedQuery, setPreparedQuery] = useState(prepareSearchQuery(defaultSearchData))
  const [searchValues, setSearchValues] = useState(defaultSearchValues)
  const [searchHitValues, setSearchHitValues] = useState(defaultSearchHitValues)
  const [searchResults, setSearchResults] = useState(defaultSearchResults)

  const checkValues = searchValues && searchValues.length
  const checkHitValues = searchHitValues && searchHitValues.length
  const checkResults = searchResults && searchResults.length

  useEffect(() => {
    const result = querySearch(preparedQuery, inputValue, { minHitLength, maxHitPages, maxHitWords })
    setSearchValues(result.values)
    setSearchHitValues(result.hitValues)
    setSearchResults(result.results)
  }, [
    inputValue,
    preparedQuery,
    minHitLength,
    maxHitPages,
    maxHitWords,
  ])

  /**
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  const searchHandler = (event) => {
    const nextValue = event.target.value || ""
    setInputValue(nextValue)
    setCallSearchData(true)
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
    const regValues = new RegExp(
      `(${searchValues.map(escapeRegExp).join("|")})`,
      "ig",
    )
    const regHitValues = new RegExp(
      `(${searchHitValues.map(escapeRegExp).join("|")})`,
      "ig",
    )
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
    let active = true
    setPreparedQuery(prepareSearchQuery(defaultSearchData))

    const getSearchData = async () => {
      let filePath = searchFilePath

      if (apply === "build") {
        const el = document.querySelector(`[${relativeAttr}]`)
        const distance = Number(el?.getAttribute(relativeAttr)) || 0
        const here = location.pathname
        let segments = here.split("/").filter(Boolean)
        distance > 0 && (segments = segments.slice(0, -distance))
        const newRoot = "/" + segments.join("/") + "/"
        filePath = newRoot.replace(/\/+$/, "/") + filePath
        setRoot(newRoot)
      } else {
        filePath = basedUrl(filePath)
      }

      const response = await fetch(filePath)
      /** @type {SearchData} */
      const data = await response.json()
      if (active) setPreparedQuery(prepareSearchQuery(data))
    }
    getSearchData()
    return () => { active = false }
  }, [callSearchData, searchFilePath, relativeAttr])

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
