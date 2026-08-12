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
import { getDefaultHeadTags, filterHeadTags, headTagsToStr } from "./tag.js"

const compatibilityRenderer = new ReactRenderToStringRenderer()
const documents = new NodeHtmlDocumentFactory()

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
  const filterdHeadTags = filterHeadTags(mergedHeadTags)
  const tagsStr = headTagsToStr(filterdHeadTags)

  const html =
    `<!doctype html>` +
    `<html${htmlAttrsStr ? " " + htmlAttrsStr : ""}>` +
    `<head>` +
    tagsStr +
    `</head>` +
    `<body${bodyAttrsStr ? " " + bodyAttrsStr : ""}>` +
    markup +
    `</body></html>`

  return documents.parse({
    pageId,
    html,
  })
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
