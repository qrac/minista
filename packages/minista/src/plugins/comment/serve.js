/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */

import { parse as parseHtml } from "node-html-parser"

import { getPluginName } from "../../shared/name.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginCommentServe(opts) {
  const names = ["comment", "serve"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-comment"

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    async transformIndexHtml(html) {
      let parsedHtml = parseHtml(html)

      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
      if (!targetEls.length) return html

      for (const el of targetEls) {
        const text = el.innerText
        const commentNode = `<!-- ${text} -->`
        el.replaceWith(commentNode)
      }
      return parsedHtml.toString()
    },
  }
}
