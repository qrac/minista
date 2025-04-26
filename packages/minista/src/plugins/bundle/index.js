/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginBundleServe } from "./serve.js"
import { pluginBundleBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: [
    "/src/layouts/index.{tsx,jsx}",
    "/src/pages/**/*.{tsx,jsx}",
    "!/src/pages/**/*.mpa.{tsx,jsx}",
    "!/src/pages/**/*.enhance.{tsx,jsx}",
    "!/src/pages/**/*.stories.{tsx,jsx}",
  ],
  outName: "bundle",
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginBundle(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginBundleServe(_opts), pluginBundleBuild(_opts)]
}
