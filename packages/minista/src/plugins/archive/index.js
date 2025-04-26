/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginArchiveBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  srcDir: "dist",
  outName: "dist",
  ignore: [],
  format: "zip",
  options: { zlib: { level: 9 } },
  multiple: [],
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginArchive(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginArchiveBuild(_opts)]
}
