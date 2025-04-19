import { defaultOptions } from "./option.js"
import { pluginBundleServe } from "./serve.js"
import { pluginBundleBuild } from "./build.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginBundle(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginBundleServe(_opts), pluginBundleBuild(_opts)]
}
