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
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin[]}
 */
export function pluginMdx(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const mdxOptions = resolveMdxOptions(opts)

  return [
    {
      ...mdxjsRollup(mdxOptions),
      name: "vite-plugin:minista-mdx",
      enforce: "pre",
    },
  ]
}
