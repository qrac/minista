// @ts-check

import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { scheduleFeatures } from "../../core/lifecycle/index.js"
import { ViteApplicationContractError } from "./client-build.js"

/** @typedef {import("vite").Plugin} Plugin */
/** @typedef {"generateBundle" | "writeBundle" | "transformIndexHtml"} Operation */

/** @param {unknown} hook @returns {Function | undefined} */
function handler(hook) {
  return typeof hook === "function" ? hook :
    hook && typeof hook === "object" ? Reflect.get(hook, "handler") : undefined
}

/**
 * Schedule the entire application before selecting a hook's participants.
 * Domain operation dependencies are deliberately independent of Vite ordering.
 * @param {readonly Plugin[]} plugins
 */
export function planViteFeatureLifecycle(plugins) {
  const participants = plugins.filter((plugin) => plugin.api?.minista?.lifecycle)
  const diagnostics = new DiagnosticCollector()
  const providesHtml = participants.some((plugin) =>
    plugin.api.minista.feature.provides?.includes("html-documents"))
  const input = {
    id: "vite-output-input", apiVersion: 1, options: {}, hooks: {},
    provides: ["output-files", ...providesHtml ? [] : ["html-documents"]],
  }
  const features = participants.map((plugin) => ({ ...plugin.api.minista.feature, hooks: {} }))
  const scheduled = scheduleFeatures(/** @type {any} */ ([input, ...features]), diagnostics)
  if (diagnostics.hasErrors()) {
    const error = new ViteApplicationContractError("MINISTA_VITE_LIFECYCLE_INVALID", "Invalid Minista application feature dependencies.")
    Reflect.set(error, "diagnostics", diagnostics.snapshot())
    throw error
  }
  const byId = new Map(participants.map((plugin) => [plugin.api.minista.feature.id, plugin]))
  return scheduled.flatMap((feature) => {
    const plugin = byId.get(feature.id)
    return plugin ? [plugin] : []
  })
}

/**
 * Bridge existing feature pipelines into one scheduled output boundary. Source
 * transforms remain ordinary Vite hooks. Each operation is executed exactly once
 * by the first participating Vite hook; its order comes from the Core scheduler.
 * @param {Plugin} plugin
 * @param {{documentContent?: boolean}} [options]
 * @returns {Plugin}
 */
export function registerViteFeatureLifecycle(plugin, options = {}) {
  /** @type {WeakMap<import("vite").ViteDevServer, Promise<unknown>>} */
  const pending = new WeakMap()
  const api = plugin.api.minista
  const operations = {
    /** @template T @param {import("vite").ViteDevServer} server @param {() => Promise<T>} operation @returns {Promise<T>} */
    runDev(server, operation) {
      const result = (pending.get(server) ?? Promise.resolve()).then(operation)
      const settled = result.catch(() => {})
      pending.set(server, settled)
      void settled.then(() => {
        if (pending.get(server) === settled) pending.delete(server)
      })
      return result
    },
    documentContent: options.documentContent ? handler(plugin.transformIndexHtml) : undefined,
    generateBundle: handler(plugin.generateBundle),
    writeBundle: handler(plugin.writeBundle),
    // SSG's pre HTML hook injects Vite scripts and is not a domain operation.
    transformIndexHtml: typeof plugin.transformIndexHtml === "function"
      ? plugin.transformIndexHtml : undefined,
  }
  api.lifecycle = Object.freeze(operations)
  const configure = handler(plugin.configureServer)
  plugin.configureServer = function (server) {
    // Validate at startup, including optional features without HTML transforms.
    planViteFeatureLifecycle(server.config.plugins)
    return configure?.call(this, server)
  }

  /** @param {readonly Plugin[]} plugins @param {Operation} operation */
  const participants = (plugins, operation) => plugins.filter((item) =>
    item.api?.minista?.lifecycle?.[operation])

  for (const operation of /** @type {const} */ (["generateBundle", "writeBundle"])) {
    if (!operations[operation]) continue
    /** @this {import("rolldown").PluginContext & {environment: import("vite").Environment}} @param {any[]} args */
    const execute = async function (...args) {
      const plugins = this.environment.plugins
      if (participants(plugins, operation)[0]?.api.minista.lifecycle !== operations) return
      for (const item of planViteFeatureLifecycle(plugins)) {
        const run = item.api.minista.lifecycle[operation]
        if (run) await run.apply(this, args)
      }
    }
    // All output mutation finishes in a post hook, after ordinary Vite output
    // generation. writeBundle must be sequential to avoid racing file writers.
    if (operation === "generateBundle") plugin.generateBundle = { order: "post", handler: execute }
    else plugin.writeBundle = { order: "post", sequential: true, handler: execute }
  }
  if (operations.transformIndexHtml) {
    plugin.transformIndexHtml = async function (html, context) {
      const server = context.server
      if (!server) return html
      const plugins = server.config.plugins
      if (participants(plugins, "transformIndexHtml")[0]?.api.minista.lifecycle !== operations) return html
      return runViteDevLifecycle(server, async () => {
        for (const item of planViteFeatureLifecycle(plugins)) {
          const run = item.api.minista.lifecycle.transformIndexHtml
          if (run) html = await run(html, context) ?? html
        }
        return html
      })
    }
  }
  return plugin
}

/**
 * Serialize domain mutations in one server session. The first registered
 * participant owns the queue; the execution plan itself remains order-independent.
 * @template T
 * @param {import("vite").ViteDevServer} server
 * @param {() => Promise<T>} operation
 * @returns {Promise<T>}
 */
export function runViteDevLifecycle(server, operation) {
  const owner = server.config.plugins.find((plugin) => plugin.api?.minista?.lifecycle)
  return owner ? owner.api.minista.lifecycle.runDev(server, operation) : operation()
}

/**
 * Resolve visible document content for derived data without injecting dev
 * scripts or generating client assets. Call inside runViteDevLifecycle.
 * @param {string} html
 * @param {import("vite").IndexHtmlTransformContext} context
 */
export async function transformViteDocumentContent(html, context) {
  if (!context.server) return html
  for (const plugin of planViteFeatureLifecycle(context.server.config.plugins)) {
    const transform = plugin.api.minista.lifecycle.documentContent
    if (transform) html = await transform(html, context) ?? html
  }
  return html
}
