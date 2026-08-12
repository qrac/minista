/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { createNodeId } from "../../core/graph/index.js"
import { composeCommentDocument } from "../../features/comment/index.js"
import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}
const documents = new NodeHtmlDocumentFactory()

/**
 * @param {string} html
 * @param {string} pageIdentity
 */
function transformCommentHtml(html, pageIdentity) {
  const document = documents.parse({
    pageId: createNodeId("page", "legacy-comment", pageIdentity),
    html,
  })
  const count = composeCommentDocument(document)
  return count > 0 ? document.serialize() : html
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginComment(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  let isDev = false
  let isSsr = false
  let isBuild = false

  return {
    name: "vite-plugin:minista-comment",
    api: { minista: { feature: { id: "comment", apiVersion: 1, options: opts, provides: ["html-comments"], requires: ["html"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    async transformIndexHtml(html, context) {
      return transformCommentHtml(html, context.path)
    },
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )

      for (const item of htmlItems) {
        item.source = transformCommentHtml(String(item.source), item.fileName)
      }
    },
  }
}
