import { defaultOptions } from "./option.js"
import { pluginBeautifyBuild } from "./build.js"
import { mergeObj } from "../../utils/obj.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginBeautify(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginBeautifyBuild(_opts)]
}
