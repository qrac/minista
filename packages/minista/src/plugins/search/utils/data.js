/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {import('../../ssg/types').SsgPage} SsgPage */

import {
  NodeHtmlDocumentFactory,
  NodeSearchDocumentAnalyzer,
} from "../../../adapters/html/index.js"
import { createNodeId } from "../../../core/graph/index.js"
import { analyzeRenderedSearchPages } from "../../../features/search/index.js"

const documents = new NodeHtmlDocumentFactory()
const analyzer = new NodeSearchDocumentAnalyzer()

/**
 * @param {SsgPage[]} ssgPages
 * @param {PluginOptions} options
 */
export async function getSearchData(ssgPages, options) {
  return analyzeRenderedSearchPages(
    ssgPages.map((page) => ({
      url: page.url,
      fileName: page.fileName,
      document: documents.parse({
        pageId: createNodeId("page", "legacy-search", page.url),
        html: page.html,
      }),
    })),
    options,
    analyzer,
  )
}
