import { defaultOptions } from "./option.js"
import { pluginArchiveBuild } from "./build.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginArchive(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginArchiveBuild(_opts)]
}
