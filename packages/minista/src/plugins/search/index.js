/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import { pluginSearchServe } from "./serve.js"
import { pluginSearchBuild } from "./build.js"
import { mergeObj } from "../../shared/obj.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  outName: "search",
  src: ["**/*.html"],
  ignore: ["404.html"],
  trimTitle: "",
  targetSelector: "[data-search]",
  relativeAttr: "data-search-relative",
  inputAttr: "data-search-input",
  hit: {
    minLength: 3,
    number: false,
    english: true,
    hiragana: false,
    katakana: true,
    kanji: true,
  },
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginSearch(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginSearchServe(_opts), pluginSearchBuild(_opts)]
}
