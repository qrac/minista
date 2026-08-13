/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { NodeSvgSourceResolver } from "../../adapters/html/index.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { composeViteHtml } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
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
  const devServers = new ViteDevServerRegistry()
  const sourceStates = new ViteEnvironmentState(() => ({
    /** @type {NodeSvgSourceResolver | undefined} */
    sources: undefined,
  }))

  /** @param {object} identity @param {string} rootDir */
  function getSources(identity, rootDir) {
    const state = sourceStates.get(identity)
    state.sources ??= new NodeSvgSourceResolver(rootDir, opts.config)
    return state.sources
  }

  /**
   * @param {string} html
   * @param {string} pageIdentity
   * @param {NodeSvgSourceResolver} sources
   * @returns {Promise<string>}
   */
  async function transformSvgHtml(html, pageIdentity, sources) {
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
    configureServer(server) {
      devServers.add(server)
      server.httpServer?.once("close", () => devServers.delete(server))
    },
    async transformIndexHtml(html, context) {
      const server = devServers.resolve(context)
      if (!server) return html
      const rootDir = getRootDir(cwd, server.config.root || "")
      return transformSvgHtml(
        html,
        context.path,
        getSources(server, rootDir),
      )
    },
    async generateBundle(options, bundle) {
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      const sources = getSources(this.environment, rootDir)
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      for (const item of htmlItems) {
        item.source = await transformSvgHtml(
          String(item.source),
          item.fileName,
          sources,
        )
      }
    },
  }
}
