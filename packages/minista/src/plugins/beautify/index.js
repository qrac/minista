/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { pluginBeautifyBuild } from "./build.js"
import { mergeObj } from "../../shared/obj.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
    inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
  },
  cssOptions: {
    indent_size: 2,
    space_around_combinator: true,
  },
  jsOptions: {
    indent_size: 2,
  },
  removeImagePreload: true,
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginBeautify(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginBeautifyBuild(_opts)]
}
