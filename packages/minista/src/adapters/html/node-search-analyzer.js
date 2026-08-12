// @ts-check

import mojigiri from "mojigiri"

import { getNativeNodeHtmlDocumentRoot } from "./node-html-document.js"

/** @typedef {import("node-html-parser").HTMLElement} HTMLElement */
/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../features/search/index.js").SearchAnalyzeOptions} SearchAnalyzeOptions */

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "br", "div", "dl", "dt",
  "dd", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2",
  "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol",
  "p", "pre", "section", "table", "thead", "tbody", "tfoot", "tr", "td",
  "th", "ul",
])

/**
 * @param {HTMLElement} root
 * @returns {string}
 */
export function getSpacedRawText(root) {
  /** @type {string[]} */
  const output = []

  /** @param {any} node */
  function walk(node) {
    if (!node) return
    const tag = node.tagName ? String(node.tagName).toLowerCase() : ""
    if (tag === "script" || tag === "style") return
    if (tag && BLOCK_TAGS.has(tag)) output.push(" ")
    if (typeof node.rawText === "string" && !node.childNodes?.length) {
      output.push(node.rawText)
    } else if (node.childNodes?.length) {
      for (const child of node.childNodes) walk(child)
    } else if (typeof node._rawText === "string") {
      output.push(node._rawText)
    }
    if (tag && BLOCK_TAGS.has(tag)) output.push(" ")
  }

  walk(root)
  return output.join("")
}

/** @param {string} text */
function optimizeText(text) {
  return text.replace(/\n/g, "").replace(/\s{2,}/g, " ").trim()
}

/**
 * @param {HTMLElement} element
 * @param {readonly string[]} selectors
 */
function isIgnored(element, selectors) {
  return selectors.some((selector) => {
    const parent = element.parentNode
    return parent && parent.querySelector(selector) === element
  })
}

/**
 * @param {HTMLElement} pageElement
 * @param {readonly string[]} ignoreSelectors
 */
function extractPage(pageElement, ignoreSelectors) {
  /** @type {[number, string][]} */
  const toc = []
  /** @type {string[][]} */
  const content = []
  let contentCount = 0

  /** @param {HTMLElement & {_rawText?: string}} element */
  function walk(element) {
    if (isIgnored(element, ignoreSelectors)) return
    if (element.id) toc.push([contentCount, element.id])
    if (element._rawText) {
      const words = mojigiri(optimizeText(getSpacedRawText(element)))
      if (words.length) {
        content.push(words)
        contentCount += words.length
      }
    }
    if (element.childNodes) {
      // @ts-ignore node-html-parser exposes heterogeneous child nodes.
      element.childNodes.forEach(walk)
    }
  }

  walk(pageElement)
  return { toc, content: content.flat() }
}

export class NodeSearchDocumentAnalyzer {
  /**
   * @param {HtmlDocument} document
   * @param {SearchAnalyzeOptions} options
   */
  async analyze(document, options) {
    const root = getNativeNodeHtmlDocumentRoot(document)
    let titleText = root.querySelector("title")?.rawText ?? ""
    if (titleText && options.trimTitle) {
      titleText = titleText.replace(options.trimTitle, "")
    }
    const title = mojigiri(titleText)
    const pageElement = root.querySelector(options.targetSelector)
    if (!pageElement) {
      return Object.freeze({
        words: Object.freeze(mojigiri(titleText)),
        title: Object.freeze(title),
        toc: Object.freeze([]),
        content: Object.freeze([]),
      })
    }
    const { toc, content } = extractPage(pageElement, options.ignoreSelectors)
    const pageText = optimizeText(getSpacedRawText(pageElement))
    return Object.freeze({
      words: Object.freeze(mojigiri(`${titleText} ${pageText}`)),
      title: Object.freeze(title),
      toc: Object.freeze(toc),
      content: Object.freeze(content),
    })
  }
}
