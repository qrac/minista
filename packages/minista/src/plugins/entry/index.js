/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */

import { pluginEntryBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginEntry(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginEntryBuild(_opts)]
}
