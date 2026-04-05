/** @typedef {import('node-html-parser').HTMLElement} HTMLElement */
/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {import('../types').SearchData} SearchData */
/** @typedef {import('../../ssg/types').SsgPage} SsgPage */

import picomatch from "picomatch"
import { parse } from "node-html-parser"
import mojigiri from "mojigiri"

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "div",
  "dl",
  "dt",
  "dd",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "ul",
])

/**
 * @param {HTMLElement} root
 * @param {{ blockTags?: Set<string>; addNewline?: boolean }} [opts]
 * @returns {string}
 */
export function getSpacedRawText(root, opts) {
  const blockTags = opts?.blockTags ?? BLOCK_TAGS
  const sep = opts?.addNewline ? "\n" : " "

  /** @type {string[]} */
  const out = []

  /**
   * @param {any} node
   */
  function walk(node) {
    if (!node) return

    const tag = node.tagName ? String(node.tagName).toLowerCase() : ""
    if (tag === "script" || tag === "style") return

    if (tag && blockTags.has(tag)) out.push(sep)

    if (typeof node.rawText === "string" && !node.childNodes?.length) {
      out.push(node.rawText)
    } else if (node.childNodes?.length) {
      for (const child of node.childNodes) walk(child)
    } else if (typeof node._rawText === "string") {
      out.push(node._rawText)
    }
    if (tag && blockTags.has(tag)) out.push(sep)
  }

  walk(root)
  return out.join("")
}

/**
 * @param {HTMLElement} parsedHtml
 * @param {string} trimTitle
 * @returns {string}
 */
function getTitleStr(parsedHtml, trimTitle) {
  let title = ""

  const pTitle = parsedHtml.querySelector("title")
  title = pTitle ? pTitle.rawText : ""

  if (title && trimTitle) {
    title = title.replace(trimTitle, "")
  }
  return title
}

/**
 * @param {string} text
 * @returns {string}
 */
function optimizeStr(text) {
  return text
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * @param {HTMLElement} el
 * @param {string[]} selectors
 * @returns {boolean}
 */
function isIgnored(el, selectors) {
  return selectors.some((selector) => {
    const parent = el.parentNode
    return parent && parent.querySelector(selector) === el
  })
}

/**
 * @param {HTMLElement} pageEl
 * @param {string[]} ignoreSelectors
 * @returns {{toc: [number, string][]; content: string[]}}
 */
function extractPage(pageEl, ignoreSelectors) {
  /** @type {[number, string][]} */
  let toc = []
  /** @type {string[][]} */
  let contentArray = []
  let contentCount = 0

  /**
   * @param {HTMLElement & {_rawText?: string}} el
   */
  function walk(el) {
    if (isIgnored(el, ignoreSelectors)) return
    if (el.id) toc.push([contentCount, el.id])
    if (el._rawText) {
      const text = optimizeStr(getSpacedRawText(el))
      const words = mojigiri(text)
      if (words.length) {
        contentArray.push(words)
        contentCount += words.length
      }
    }
    if (el.childNodes) {
      /* @ts-ignore */
      el.childNodes.forEach(walk)
    }
  }
  walk(pageEl)

  return { toc, content: contentArray.flat() }
}

/**
 * @param {SsgPage[]} ssgPages
 * @param {PluginOptions} opts
 * @returns {SearchData}
 */
export function getSearchData(ssgPages, opts) {
  const { src, ignore, trimTitle, targetSelector, ignoreSelectors, hit } = opts

  /** @type {string[]} */
  let tempWords = []
  /** @type {{ url: string; title: string[]; toc: [number, string][]; content: string[] }[]} */
  let tempPages = []
  /** @type {SearchData} */
  let result = { words: [], hits: [], pages: [] }

  const filterdPages = ssgPages.filter((page) => {
    return picomatch.isMatch(page.fileName, src, { ignore })
  })
  if (filterdPages.length === 0) return result

  for (const page of filterdPages) {
    const parsedHtml = parse(page.html, {
      blockTextElements: { script: false, style: false, pre: false },
    })
    const titleStr = getTitleStr(parsedHtml, trimTitle)
    const titleArray = mojigiri(titleStr)
    let pageEl = parsedHtml.querySelector(targetSelector)

    if (!pageEl) {
      tempWords.push(titleStr)
      tempPages.push({ url: page.url, title: titleArray, toc: [], content: [] })
      continue
    }
    const { toc, content } = extractPage(pageEl, ignoreSelectors)
    const pageStr = optimizeStr(getSpacedRawText(pageEl))
    tempWords.push(titleStr)
    tempWords.push(pageStr)
    tempPages.push({
      url: page.url,
      title: titleArray,
      toc,
      content,
    })
  }

  result.words = [...new Set(mojigiri(tempWords.join(" ")))].sort()

  const regHitsArray = [
    hit.number && "[0-9]",
    hit.english && "[a-zA-Z]",
    hit.hiragana && "[ぁ-ん]",
    hit.katakana && "[ァ-ヴ]",
    hit.kanji &&
      "[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FC3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9]",
  ].filter(Boolean)
  const regHits = new RegExp(`(${regHitsArray.join("|")})`)
  const hitWords = result.words.filter(
    (word) =>
      word.length >= hit.minLength && regHits.test(word) && word !== "...",
  )
  result.hits = hitWords.map((word) => result.words.indexOf(word))

  result.pages = tempPages
    .map((page) => ({
      url: page.url,
      title: page.title.map((w) => result.words.indexOf(w)),
      toc: page.toc,
      content: page.content.map((w) => result.words.indexOf(w)),
    }))
    .sort((a, b) => a.url.localeCompare(b.url, "en", { sensitivity: "base" }))

  return result
}
