// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./compose.js").CommentFeatureOptions} CommentFeatureOptions */

export const COMMENT_FEATURE_ID = createNodeId("feature", "comment")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {HtmlDocument} document
 * @returns {number}
 */
export function composeCommentDocument(document) {
  const elements = document.select("[data-minista-comment]")

  for (const element of elements) {
    document.bind(element, {
      featureId: COMMENT_FEATURE_ID,
      nodeId: document.pageId,
    })
    element.replaceWith(`<!-- ${element.text} -->`)
  }

  return elements.length
}

/**
 * @param {CommentFeatureOptions} [options]
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<CommentFeatureOptions>}
 */
export function createCommentFeature(options = {}) {
  return Object.freeze({
    id: COMMENT_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("html-comments")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      compose(context) {
        for (const document of context.documents.list()) {
          composeCommentDocument(document)
        }
      },
    }),
  })
}
