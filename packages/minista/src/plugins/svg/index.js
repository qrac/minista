/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginSvgServe } from "./serve.js"
import { pluginSvgBuild } from "./build.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSvg(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginSvgServe(_opts), pluginSvgBuild(_opts)]
}
