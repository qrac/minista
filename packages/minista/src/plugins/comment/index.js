import { registerViteFeatureLifecycle } from "../../adapters/vite/feature-lifecycle.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */

import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import {
  composeViteHtml,
  createViteCompatibilityTraceHooks,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { createCommentFeature } from "../../features/comment/index.js"
import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}
/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginComment(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const feature = createCommentFeature(opts)
  const devServers = new ViteDevServerRegistry()

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-comment",
    api: { minista: { feature: { id: "comment", apiVersion: 1, options: opts, provides: ["html-comments"], requires: ["html-documents"] } } },
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
      return composeViteHtml(
        html,
        context.path,
        [feature],
        server
          ? createViteCompatibilityTraceHooks(
            getViteBuildSession(server.config),
            "comment:dev",
          )
          : undefined,
      )
    },
    async generateBundle(options, bundle) {
      const traceHooks = createViteCompatibilityTraceHooks(
        getViteBuildSession(this.environment.getTopLevelConfig()),
        "comment:build",
      )
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )

      for (const item of htmlItems) {
        item.source = await composeViteHtml(
          String(item.source),
          item.fileName,
          [feature],
          traceHooks,
        )
      }
    },
  }, { documentContent: true })
}
