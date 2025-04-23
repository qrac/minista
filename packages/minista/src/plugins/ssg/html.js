import { createElement } from "react"
import { renderToString } from "react-dom/server"

import { HeadProvider } from "./provider.js"
import {
  headAttrsToStr,
  checkCharsetTag,
  checkViewportTag,
  getDefaultHeadTags,
  filterHeadTags,
  headTagsToStr,
} from "./utils.js"

/** @typedef {import('./types').ResolvedLayout} ResolvedLayout */
/** @typedef {import('./types').ResolvedPage} ResolvedPage */
/** @typedef {import('./types').HeadData} HeadData */

/**
 * @param {{ resolvedLayout: ResolvedLayout, resolvedPage: ResolvedPage }} params
 * @returns {string}
 */
export function transformHtml({ resolvedLayout, resolvedPage }) {
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

  let markup = renderToString(
    createElement(
      HeadProvider,
      { headData },
      Layout
        ? createElement(Layout, props, createElement(Page, props))
        : createElement(Page, props)
    )
  )
  markup = markup.replace(/(?<=\<[img|source].+?)(srcSet=)/g, "srcset=")

  const htmlAttrs = headData.htmlAttributes || {}
  const bodyAttrs = headData.bodyAttributes || {}
  const tags = headData.tags || []

  const htmlAttrsStr = headAttrsToStr({ ...{ lang: "ja" }, ...htmlAttrs })
  const bodyAttrsStr = headAttrsToStr(bodyAttrs)

  const hasCharset = checkCharsetTag(tags)
  const hasViewport = checkViewportTag(tags)

  const defaultHeadTags = getDefaultHeadTags(
    headData.title,
    hasCharset,
    hasViewport
  )
  const mergedHeadTags = [...defaultHeadTags, ...tags]
  const filterdHeadTags = filterHeadTags(mergedHeadTags)
  const tagsStr = headTagsToStr(filterdHeadTags)

  return (
    `<!doctype html>` +
    `<html${htmlAttrsStr ? " " + htmlAttrsStr : ""}>` +
    `<head>` +
    tagsStr +
    `</head>` +
    `<body${bodyAttrsStr ? " " + bodyAttrsStr : ""}>` +
    markup +
    `</body></html>`
  )
}
