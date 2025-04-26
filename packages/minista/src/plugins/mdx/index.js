/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import mdxjsRollup from "@mdx-js/rollup"

import { resolveMdxOptions } from "./utils/option.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  remarkPlugins: [],
  rehypePlugins: [],
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginMdx(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  const mdxOptions = resolveMdxOptions(_opts)
  return [mdxjsRollup(mdxOptions)]
}
