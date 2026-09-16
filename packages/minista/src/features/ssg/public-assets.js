// @ts-check

import { htmlUrlRanges } from "../../core/document/url-ranges.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/document/index.js").HtmlElement} HtmlElement */
/** @typedef {import("./assets.js").SsgAssetOutputResolver} SsgAssetOutputResolver */

/** @type {Readonly<Record<string, readonly string[]>>} */
const attributes = {
  a: ["href"],
  audio: ["src"],
  embed: ["src"],
  image: ["href", "xlink:href"],
  img: ["src", "srcset"],
  input: ["src"],
  link: ["href", "imagesrcset"],
  object: ["data"],
  script: ["src"],
  source: ["src", "srcset"],
  track: ["src"],
  use: ["href", "xlink:href"],
  video: ["src", "poster"],
}
const metaNames = new Set([
  "msapplication-tileimage", "msapplication-square70x70logo",
  "msapplication-square150x150logo", "msapplication-wide310x150logo",
  "msapplication-square310x310logo", "msapplication-config", "twitter:image",
])
const metaProperties = new Set([
  "og:image", "og:image:url", "og:image:secure_url", "og:audio",
  "og:audio:secure_url", "og:video", "og:video:secure_url",
])

// Tokenize comments and strings as well as url(), so text that merely contains
// "url(...)" is preserved. Escaped CSS URLs stay under the CSS author's control.
const cssTokens = /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|(?<![-\w\u0080-\uffff])url\(\s*(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'|((?:\\[\s\S]|[^"'()\s\\])*))\s*\)/gdi

/**
 * Compose only URLs whose pathname names an existing public file. The adapter
 * owns file discovery, output URL resolution and exclusions for client content.
 * @param {HtmlDocument} document
 * @param {ReadonlySet<string>} publicFiles
 * @param {SsgAssetOutputResolver} outputs
 * @param {ReadonlySet<HtmlElement>} [excluded]
 * @returns {number}
 */
export function composeSsgPublicAssetDocument(document, publicFiles, outputs, excluded = new Set()) {
  if (publicFiles.size === 0) return 0

  /** @param {string} url */
  function rewriteUrl(url) {
    if (!url.startsWith("/") || url.startsWith("//")) return url
    const pathname = url.split(/[?#]/)[0] ?? ""
    let fileName
    try {
      fileName = decodeURIComponent(pathname.slice(1))
    } catch {
      return url
    }
    if (!publicFiles.has(fileName)) return url
    // Resolve the original spelling to retain percent encoding and URL suffixes.
    const output = outputs.resolve(pathname.slice(1), document.pageId)
    return output === undefined ? url : output + url.slice(pathname.length)
  }

  /** @param {string} value @param {boolean} srcset */
  function rewriteAttribute(value, srcset) {
    let next = value
    for (const { start, end } of htmlUrlRanges(value, srcset).reverse()) {
      next = next.slice(0, start) + rewriteUrl(value.slice(start, end)) + next.slice(end)
    }
    return next
  }

  /** @param {string} value */
  function rewriteCss(value) {
    let next = value
    for (const match of [...value.matchAll(cssTokens)].reverse()) {
      const range = match.indices?.[1] ?? match.indices?.[2] ?? match.indices?.[3]
      if (!range) continue
      const [start, end] = range
      const url = value.slice(start, end)
      if (url.includes("\\")) continue
      next = next.slice(0, start) + rewriteUrl(url) + next.slice(end)
    }
    return next
  }

  let composed = 0
  for (const element of document.select("*")) {
    if (excluded.has(element)) continue
    const names = element.tagName === "meta"
      ? metaNames.has(element.getAttribute("name")?.trim().toLowerCase() ?? "") ||
        metaProperties.has(element.getAttribute("property")?.trim().toLowerCase() ?? "")
        ? ["content"] : []
      : Object.hasOwn(attributes, element.tagName) ? attributes[element.tagName] ?? [] : []
    for (const name of names) {
      const value = element.getAttribute(name)
      if (!value) continue
      const next = rewriteAttribute(value, name === "srcset" || name === "imagesrcset")
      if (next === value) continue
      element.setAttribute(name, next)
      composed++
    }
    const style = element.getAttribute("style")
    if (style) {
      const next = rewriteCss(style)
      if (next !== style) {
        element.setAttribute("style", next)
        composed++
      }
    }
    if (element.tagName === "style") {
      const style = element.innerHtml
      const next = rewriteCss(style)
      if (next !== style) {
        element.setInnerHtml(next)
        composed++
      }
    }
  }
  return composed
}
