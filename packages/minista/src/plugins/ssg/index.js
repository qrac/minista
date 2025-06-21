/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginSsgServe } from "./serve.js"
import { pluginSsgBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  layout: "/src/layouts/index.{tsx,jsx}",
  src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
  srcBases: ["/src/pages"],
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSsg(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginSsgServe(_opts), pluginSsgBuild(_opts)]
}
