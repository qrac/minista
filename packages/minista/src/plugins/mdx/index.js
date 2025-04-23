import mdxjsRollup from "@mdx-js/rollup"

import { defaultOptions, resolveMdxOptions } from "./option.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginMdx(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  const mdxOptions = resolveMdxOptions(_opts)
  return [mdxjsRollup(mdxOptions)]
}
