/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */

import { pluginCommentServe } from "./serve.js"
import { pluginCommentBuild } from "./build.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginComment(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginCommentServe(_opts), pluginCommentBuild(_opts)]
}
