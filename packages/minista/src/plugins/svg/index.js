import path from "node:path"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { registerViteFeatureLifecycle } from "../../adapters/vite/feature-lifecycle.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { NodeSvgSourceResolver } from "../../adapters/html/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import {
  composeViteHtml,
  createViteCompatibilityTraceHooks,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createSvgFeature, createSvgFeatureDescriptor } from "../../features/svg/index.js"
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
    /** @type {Map<string, Set<string>>} */
    pageSources: new Map(),
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
   * @param {import("../../features/svg/index.js").SvgSourceResolver} sources
   * @param {import("../../adapters/vite/compatibility-lifecycle.js").ViteCompatibilityRunHooks} [hooks]
   * @returns {Promise<string>}
   */
  async function transformSvgHtml(html, pageIdentity, sources, hooks) {
    return composeViteHtml(html, pageIdentity, [
      createSvgFeature(opts, sources),
    ], hooks)
  }

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-svg",
    api: { minista: { feature: createSvgFeatureDescriptor(opts) } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      return command === "serve" || (command === "build" && !isSsrBuild)
    },
    applyToEnvironment: isViteAppClientEnvironment,
    configureServer(server) {
      devServers.add(server)
      const rootDir = getRootDir(cwd, server.config.root || "")
      const sources = getSources(server, rootDir)
      const state = sourceStates.get(server)
      const updates = new ViteDevUpdateAdapter(server)
      /** @param {string} event @param {string} filePath */
      const onChange = (event, filePath) => {
        if (!["add", "change", "unlink"].includes(event)) return
        const absolute = path.resolve(filePath)
        sources.invalidate(path.relative(rootDir, absolute))
        const pages = [...state.pageSources]
          .filter(([, files]) => files.has(absolute)).map(([page]) => page)
        if (pages.length) updates.reloadPages(pages)
      }
      server.watcher.on("all", onChange)
      server.httpServer?.once("close", () => {
        server.watcher.off("all", onChange)
        devServers.delete(server)
      })
    },
    async transformIndexHtml(html, context) {
      const server = devServers.resolve(context)
      if (!server) return html
      const rootDir = getRootDir(cwd, server.config.root || "")
      const sources = getSources(server, rootDir)
      const references = new Set()
      sourceStates.get(server).pageSources.set(context.path, references)
      return transformSvgHtml(
        html,
        context.path,
        { resolve(source) {
          const absolute = path.resolve(rootDir, source.replace(/^\//, ""))
          references.add(absolute)
          server.watcher.add(absolute)
          return sources.resolve(source)
        } },
        createViteCompatibilityTraceHooks(
          getViteBuildSession(server.config),
          "svg:dev",
        ),
      )
    },
    async generateBundle(options, bundle) {
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      const sources = getSources(this.environment, rootDir)
      sources.clear()
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      const traceHooks = createViteCompatibilityTraceHooks(
        getViteBuildSession(this.environment.getTopLevelConfig()),
        "svg:build",
      )
      for (const item of htmlItems) {
        item.source = await transformSvgHtml(
          String(item.source),
          item.fileName,
          sources,
          traceHooks,
        )
      }
    },
  }, { documentContent: true })
}
