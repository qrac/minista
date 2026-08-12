// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./compose.js").SvgFeatureOptions} SvgFeatureOptions */
/** @typedef {import("./compose.js").SvgSourceResolver} SvgSourceResolver */

export const SVG_FEATURE_ID = createNodeId("feature", "svg")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {HtmlDocument} document
 * @param {SvgSourceResolver} sources
 * @returns {Promise<number>}
 */
export async function composeSvgDocument(document, sources) {
  const elements = document.select("[data-minista-svg]")
  let composed = 0

  for (const element of elements) {
    const sourcePath = element.getAttribute("data-minista-svg-src")
    if (!sourcePath) continue

    const source = await sources.resolve(sourcePath)
    if (!source) continue

    document.bind(element, {
      featureId: SVG_FEATURE_ID,
      nodeId: document.pageId,
    })
    element.setAttribute(
      "viewBox",
      element.getAttribute("viewBox") ?? source.viewBox ?? "0 0 0 0",
    )
    element.removeAttribute("data-minista-svg")
    element.removeAttribute("data-minista-svg-src")
    element.appendHtml(source.innerHtml)
    composed += 1
  }

  return composed
}

/**
 * @param {SvgFeatureOptions} options
 * @param {SvgSourceResolver} sources
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<SvgFeatureOptions>}
 */
export function createSvgFeature(options, sources) {
  return Object.freeze({
    id: SVG_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("inline-svg")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async compose(context) {
        for (const document of context.documents.list()) {
          await composeSvgDocument(document, sources)
        }
      },
    }),
  })
}
