/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { processViteOutputs } from "../../adapters/vite/compatibility-lifecycle.js"
import {
  createBeautifyFeature,
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

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginBeautify(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const isMatch = createOutputMatcher(opts)
  const feature = createBeautifyFeature(opts)

  return {
    name: "vite-plugin:minista-beautify",
    api: { minista: { feature: { id: "beautify", apiVersion: 1, options: opts, provides: ["formatted-output"], requires: ["html-documents", "output-files"] } } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      return command === "build" && !isSsrBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)
      const assets = Object.values(outputAssets).filter((item) =>
        isMatch(item.fileName) && /\.(html|css)$/.test(item.fileName)
      )
      const chunks = Object.values(outputChunks).filter((item) =>
        isMatch(item.fileName) && item.fileName.endsWith(".js")
      )
      const processed = await processViteOutputs([
        ...assets.map((item) => ({
          fileName: item.fileName,
          content: item.source,
        })),
        ...chunks.map((item) => ({
          fileName: item.fileName,
          content: item.code,
        })),
      ], [feature])
      const contentByFileName = new Map(processed.map((file) => [
        file.fileName,
        file.content,
      ]))
      for (const item of assets) {
        const content = contentByFileName.get(item.fileName)
        if (content !== undefined) item.source = content
      }
      for (const item of chunks) {
        const content = contentByFileName.get(item.fileName)
        if (content !== undefined) item.code = String(content)
      }
    },
  }
}
