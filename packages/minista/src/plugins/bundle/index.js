/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginBundleServe } from "./serve.js"
import { pluginBundleBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  useExportCss: true,
  src: ["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"],
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
