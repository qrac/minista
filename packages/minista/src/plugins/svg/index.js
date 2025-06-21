/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginSvgServe } from "./serve.js"
import { pluginSvgBuild } from "./build.js"
import { mergeObj } from "../../shared/obj.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSvg(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginSvgServe(_opts), pluginSvgBuild(_opts)]
}
