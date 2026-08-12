/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  composeBeautifyDocument,
  createOutputFormatter,
  createOutputMatcher,
} from "../../features/beautify/index.js"
import { mergeObj } from "../../shared/obj.js"
import { filterOutputAssets, filterOutputChunks } from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
    inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
  },
  cssOptions: {
    indent_size: 2,
    space_around_combinator: true,
  },
  jsOptions: {
    indent_size: 2,
  },
  removeImagePreload: true,
}
const documents = new NodeHtmlDocumentFactory()

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginBeautify(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const format = createOutputFormatter(opts)
  const isMatch = createOutputMatcher(opts)

  let isDev = false
  let isSsr = false
  let isBuild = false

  return {
    name: "vite-plugin:minista-beautify",
    api: { minista: { feature: { id: "beautify", apiVersion: 1, options: opts, provides: ["formatted-output"], requires: ["html-documents", "output-files"] } } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)

      for (const item of Object.values(outputAssets)) {
        if (!isMatch(item.fileName)) continue
        if (!/\.(html|css)$/.test(item.fileName)) continue
        let content = String(item.source)
        if (item.fileName.endsWith(".html") && opts.removeImagePreload) {
          const document = documents.parse({
            pageId: createNodeId("page", "legacy-beautify", item.fileName),
            html: content,
          })
          composeBeautifyDocument(document, opts)
          content = document.serialize()
        }
        const formatted = format({ fileName: item.fileName, content })
        item.source = formatted.content
      }

      for (const item of Object.values(outputChunks)) {
        if (!isMatch(item.fileName) || !item.fileName.endsWith(".js")) continue
        const formatted = format({
          fileName: item.fileName,
          content: item.code,
        })
        item.code = String(formatted.content)
      }
    },
  }
}
