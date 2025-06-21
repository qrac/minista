/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginIslandServe } from "./serve.js"
import { pluginIslandBuild } from "./build.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  useSplitPages: true,
  outName: "island-[index]",
  rootAttrName: "island",
  rootDOMElement: "div",
  rootStyle: { display: "contents" },
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginIsland(opts = {}) {
  const _opts = { ...defaultOptions, ...opts }
  return [pluginIslandServe(_opts), pluginIslandBuild(_opts)]
}
