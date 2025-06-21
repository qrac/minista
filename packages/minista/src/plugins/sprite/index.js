/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginSpriteServe } from "./serve.js"
import { pluginSpriteBuild } from "./build.js"
import { mergeObj } from "../../shared/obj.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSprite(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginSpriteServe(_opts), pluginSpriteBuild(_opts)]
}
