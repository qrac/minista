/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */

import { parse as parseHtml } from "node-html-parser"

import { getPluginName } from "../../shared/name.js"
import { filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginCommentBuild(opts) {
  const names = ["comment", "build"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-comment"

  let isSsr = false

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
    },
    async generateBundle(options, bundle) {
      if (isSsr) return

      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html")
      )

      for (const item of htmlItems) {
        let parsedHtml = parseHtml(String(item.source))

        const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
        if (targetEls.length === 0) continue

        for (const el of targetEls) {
          const text = el.innerText
          const commentNode = `<!-- ${text} -->`
          el.replaceWith(commentNode)
        }

        item.source = parsedHtml.toString()
      }
    },
  }
}
