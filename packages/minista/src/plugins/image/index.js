/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import { pluginImageServe } from "./serve.js"
import { pluginImageBuild } from "./build.js"
import { mergeObj } from "../../shared/obj.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  useCache: true,
  optimize: {
    outName: "[name]-[width]x[height]",
    remoteName: "remote-[index]",
    layout: "constrained",
    breakpoints: [320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840],
    resolutions: [1, 2],
    format: "inherit",
    formatOptions: {},
    quality: undefined,
    aspect: undefined,
    background: undefined,
    fit: "cover",
    position: "centre",
  },
  decoding: "async",
  loading: "eager",
}

/**
 * @param {UserPluginOptions} opts
 * @returns {Plugin[]}
 */
export function pluginImage(opts = {}) {
  const _opts = mergeObj(defaultOptions, opts)
  return [pluginImageServe(_opts), pluginImageBuild(_opts)]
}
