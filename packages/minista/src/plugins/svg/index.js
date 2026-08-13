/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { NodeSvgSourceResolver } from "../../adapters/html/index.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { composeViteHtml } from "../../adapters/vite/compatibility-lifecycle.js"
import { createSvgFeature } from "../../features/svg/index.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir } from "../../shared/path.js"
import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSvg(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()

  let rootDir = ""
  /** @type {NodeSvgSourceResolver | undefined} */
  let sources

  /**
   * @param {string} html
   * @param {string} pageIdentity
   * @returns {Promise<string>}
   */
  async function transformSvgHtml(html, pageIdentity) {
    if (!sources) return html
    return composeViteHtml(html, pageIdentity, [
      createSvgFeature(opts, sources),
    ])
  }

  return {
    name: "vite-plugin:minista-svg",
    api: { minista: { feature: { id: "svg", apiVersion: 1, options: opts, provides: ["inline-svg"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      return command === "serve" || (command === "build" && !isSsrBuild)
    },
    applyToEnvironment: isViteAppClientEnvironment,
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      sources = new NodeSvgSourceResolver(rootDir, opts.config)
    },
    async transformIndexHtml(html, context) {
      return transformSvgHtml(html, context.path)
    },
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      for (const item of htmlItems) {
        item.source = await transformSvgHtml(String(item.source), item.fileName)
      }
    },
  }
}
