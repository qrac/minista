/** @typedef {import('node-html-parser').HTMLElement} HTMLElement */
/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {import('../types').SearchData} SearchData */
/** @typedef {import('../../ssg/types').SsgPage} SsgPage */

import picomatch from "picomatch"
import { parse } from "node-html-parser"
import mojigiri from "mojigiri"

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
 * @param {HTMLElement} pageEl
 * @returns {{toc: [number, string][]; content: string[]}}
 */
function extractPage(pageEl) {
  /** @type {[number, string][]} */
  let toc = []
  /** @type {string[][]} */
  let contentArray = []
  let contentCount = 0

  /**
   * @param {HTMLElement & {_rawText?: string}} el
   */
  function walk(el) {
    if (el.id) toc.push([contentCount, el.id])
    if (el._rawText) {
      const text = optimizeStr(el._rawText)
      const words = mojigiri(text)
      if (words.length) {
        contentArray.push(words)
        contentCount += words.length
      }
    }
    if (el.childNodes) {
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
  const { src, ignore, trimTitle, targetSelector, hit } = opts

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
    const spacedHtml = page.html.replace(/<\/([^>]+)>([^\n\s<])/g, "</$1> $2")
    const parsedHtml = parse(spacedHtml, {
      blockTextElements: { script: false, style: false, pre: false },
    })
    const titleStr = getTitleStr(parsedHtml, trimTitle)
    const titleArray = mojigiri(titleStr)
    const pageEl = parsedHtml.querySelector(targetSelector)

    if (!pageEl) {
      tempWords.push(titleStr)
      tempPages.push({ url: page.url, title: titleArray, toc: [], content: [] })
      continue
    }
    const { toc, content } = extractPage(pageEl)
    const pageStr = optimizeStr(parsedHtml.rawText)
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
      word.length >= hit.minLength && regHits.test(word) && word !== "..."
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
