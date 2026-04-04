/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */

import { parse as parseHtml } from "node-html-parser"

import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginComment(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const targetAttr = "data-minista-comment"

  let isDev = false
  let isSsr = false
  let isBuild = false

  return {
    name: "vite-plugin:minista-comment",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
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
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
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
