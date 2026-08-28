/** @typedef {import('../types').ResolvedLayout} ResolvedLayout */
/** @typedef {import('../types').ResolvedPage} ResolvedPage */
/** @typedef {import('../types').HeadData} HeadData */

import { createElement } from "react"

import { NodeHtmlDocumentFactory } from "../../../adapters/html/index.js"
import { ReactRenderToStringRenderer } from "../../../adapters/react/render-to-string.js"
import { createNodeId } from "../../../core/graph/index.js"
import { HeadProvider } from "../components/head.js"
import { headAttrsToStr } from "./attr.js"
import { checkCharset } from "./charset.js"
import { checkViewport } from "./viewport.js"
import {
  getDefaultHeadTags,
  filterHeadTags,
  getSemanticHeadTagKey,
  headTagsToStr,
} from "./tag.js"

const compatibilityRenderer = new ReactRenderToStringRenderer()
const documents = new NodeHtmlDocumentFactory()

/** @param {string} markup */
function hasDocumentRoot(markup) {
  return /^\s*(?:<!doctype html>\s*)?<html(?:\s|>)/i.test(markup)
}

/** @param {string} markup */
function withoutDocumentType(markup) {
  return markup.replace(/^\s*<!doctype html>\s*/i, "")
}

/**
 * @param {import("../../../core/document/index.js").HtmlElement} element
 * @param {Record<string, unknown>} attributes
 */
function applyAttributes(element, attributes) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) element.setAttribute(name, String(value))
  }
}

/**
 * @param {import("../../../core/document/index.js").HtmlDocument} document
 * @param {React.ReactElement[]} tags
 */
function removeOverriddenDocumentHeadTags(document, tags) {
  const selectors = {
    title: "head title",
    charset: "head meta[charset]",
    viewport: 'head meta[name="viewport"]',
  }
  /** @type {Set<"title" | "charset" | "viewport">} */
  const semanticKeys = new Set()
  for (const tag of tags) {
    const semanticKey = getSemanticHeadTagKey(tag)
    if (semanticKey) semanticKeys.add(semanticKey)
  }
  for (const semanticKey of semanticKeys) {
    const selector = selectors[semanticKey]
    for (const element of document.select(selector)) element.remove()
  }
}

/**
 * charsetとviewportをheadの先頭へ安定した順序で移動する。
 *
 * @param {import("../../../core/document/index.js").HtmlDocument} document
 */
function orderPriorityHeadTags(document) {
  const head = document.select("head")[0]
  if (!head) return

  const priorityElements = [
    document.select("head meta[charset]")[0],
    document.select('head meta[name="viewport"]')[0],
  ].filter((element) => element !== undefined)
  const priorityHtml = priorityElements
    .map((element) => element.outerHtml.replace(/\s*\/?>$/, ">"))
    .join("")

  for (const element of priorityElements) element.remove()
  head.setInnerHtml(priorityHtml + head.innerHtml)
}

/**
 * @param {{ resolvedLayout: ResolvedLayout, resolvedPage: ResolvedPage }} params
 * @param {import("../../../core/ports/index.js").StaticRenderer<import("react").ReactNode>} [renderer]
 * @returns {Promise<import("../../../core/document/index.js").HtmlDocument>}
 */
export async function renderHtmlDocument(
  { resolvedLayout, resolvedPage },
  renderer = compatibilityRenderer,
) {
  const layout = resolvedLayout
  const page = resolvedPage
  const Layout = layout.component
  const Page = page.component

  const props = {
    title: "",
    draft: false,
    ...layout.metadata,
    ...page.metadata,
    ...layout.staticData.props,
    ...page.staticData.props,
    url: page.url,
  }

  /** @type {HeadData} */
  let headData = {}
  const pageId =
    resolvedPage.pageId ??
    createNodeId("page", "legacy-ssg", resolvedPage.url)

  const rendered = await renderer.render({
    pageId,
    url: page.url,
    tree: createElement(
      HeadProvider,
      { headData },
      Layout
        ? createElement(Layout, props, createElement(Page, props))
        : createElement(Page, props),
    ),
  })
  let markup = rendered.html
  markup = markup.replace(/(?<=\<[img|source].+?)(srcSet=)/g, "srcset=")

  const htmlAttrs = headData.htmlAttributes || {}
  const bodyAttrs = headData.bodyAttributes || {}
  const tags = headData.tags || []

  if (hasDocumentRoot(markup)) {
    const document = documents.parse({
      pageId,
      html: `<!doctype html>${withoutDocumentType(markup)}`,
    })
    const htmlElement = document.select("html")[0]
    const headElement = document.select("head")[0]
    const bodyElement = document.select("body")[0]

    if (htmlElement && headElement && bodyElement) {
      if (!htmlElement.hasAttribute("lang")) htmlElement.setAttribute("lang", "ja")
      applyAttributes(htmlElement, htmlAttrs)
      applyAttributes(bodyElement, bodyAttrs)

      const hasCharset =
        document.select("head meta[charset]").length > 0 || checkCharset(tags)
      const hasViewport =
        document.select('head meta[name="viewport"]').length > 0 ||
        checkViewport(tags)
      const mergedHeadTags = [
        ...getDefaultHeadTags(headData.title, hasCharset, hasViewport),
        ...tags,
      ]
      const filteredHeadTags = filterHeadTags(mergedHeadTags)
      removeOverriddenDocumentHeadTags(document, filteredHeadTags)
      headElement.appendHtml(headTagsToStr(filteredHeadTags))
      orderPriorityHeadTags(document)
      return document
    }
  }

  const htmlAttrsStr = headAttrsToStr({ ...{ lang: "ja" }, ...htmlAttrs })
  const bodyAttrsStr = headAttrsToStr(bodyAttrs)

  const hasCharset = checkCharset(tags)
  const hasViewport = checkViewport(tags)

  const defaultHeadTags = getDefaultHeadTags(
    headData.title,
    hasCharset,
    hasViewport
  )
  const mergedHeadTags = [...defaultHeadTags, ...tags]
  const filteredHeadTags = filterHeadTags(mergedHeadTags)
  const tagsStr = headTagsToStr(filteredHeadTags)

  const html =
    `<!doctype html>` +
    `<html${htmlAttrsStr ? " " + htmlAttrsStr : ""}>` +
    `<head>` +
    tagsStr +
    `</head>` +
    `<body${bodyAttrsStr ? " " + bodyAttrsStr : ""}>` +
    markup +
    `</body></html>`

  const document = documents.parse({
    pageId,
    html,
  })
  orderPriorityHeadTags(document)
  return document
}

/**
 * 現行plugin向けにdocumentを一度だけserializeするcompatibility wrapper。
 *
 * @param {{ resolvedLayout: ResolvedLayout, resolvedPage: ResolvedPage }} params
 * @param {import("../../../core/ports/index.js").StaticRenderer<import("react").ReactNode>} [renderer]
 * @returns {Promise<string>}
 */
export async function transformHtml(params, renderer) {
  const document = await renderHtmlDocument(params, renderer)
  return document.serialize()
}
