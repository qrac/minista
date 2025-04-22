import { deepmergeCustom } from "deepmerge-ts"

import { defaultOptions } from "./option.js"
import { pluginBeautifyBuild } from "./build.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginBeautify(opts = {}) {
  const _opts = deepmergeCustom({
    mergeArrays: false,
  })(defaultOptions, opts)
  return [pluginBeautifyBuild(_opts)]
}
