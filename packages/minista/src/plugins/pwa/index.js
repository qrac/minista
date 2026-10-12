// @ts-check
import { createVitePwaPlugins } from "../../adapters/vite/pwa.js"

/** @param {import("./index.js").PluginPwaOptions} [options] */
export function pluginPwa(options = {}) {
  return createVitePwaPlugins(options)
}
