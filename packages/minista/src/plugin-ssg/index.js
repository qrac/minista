import { defaultOptions } from "./option.js"
import { pluginSsgServe } from "./serve.js"
import { pluginSsgBuild } from "./build.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSsg(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginSsgServe(_opts), pluginSsgBuild(_opts)]
}
