// @ts-check

import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { scheduleFeatures } from "../../core/lifecycle/index.js"

/** @typedef {import("./environment-preparation.js").ViteEnvironmentPreparation} ViteEnvironmentPreparation */

export class ViteEnvironmentPreparationError extends Error {
  code = "MINISTA_VITE_PREPARATION_INVALID"

  /** @param {readonly import("../../core/diagnostics/index.js").Diagnostic[]} diagnostics */
  constructor(diagnostics) {
    super(
      diagnostics
        .map(({ code, message }) => `[${code}] ${message}`)
        .join("\n"),
    )
    this.name = "ViteEnvironmentPreparationError"
    this.diagnostics = diagnostics
  }
}

/**
 * Run Minista-owned late preparation hooks in feature dependency order.
 * Third-party plugins are ignored unless they explicitly expose this protocol.
 *
 * @param {ViteEnvironmentPreparation} preparation
 */
export async function prepareViteClientEnvironment(preparation) {
  const entries = []
  const features = []
  const diagnostics = new DiagnosticCollector()
  for (const plugin of preparation.client.plugins ?? []) {
    const minista = Reflect.get(Reflect.get(plugin, "api") ?? {}, "minista")
    const prepareClient = Reflect.get(minista ?? {}, "prepareClient")
    const feature = Reflect.get(minista ?? {}, "feature")
    if (feature && typeof feature === "object") features.push(feature)
    if (typeof prepareClient === "function") {
      if (!feature || typeof feature !== "object") {
        diagnostics.error({
          code: "MINISTA_VITE_PREPARATION_FEATURE_MISSING",
          message: `Plugin ${plugin.name} exposes prepareClient without feature metadata.`,
        })
        continue
      }
      entries.push({ feature, prepareClient })
    }
  }

  const allIds = new Set(features.map((feature) => feature.id))
  const preparationIds = new Set(entries.map(({ feature }) => feature.id))
  const allProviders = new Set(
    features.flatMap((feature) => feature.provides ?? []),
  )
  const preparationProviders = new Set(
    entries.flatMap(({ feature }) => feature.provides ?? []),
  )
  /** @param {string} capability */
  const requiresPreparation = (capability) =>
    preparationProviders.has(capability) || !allProviders.has(capability)
  /** @param {string} id */
  const requiresPreparedFeature = (id) =>
    preparationIds.has(id) || !allIds.has(id)
  /** @param {string} id */
  const hasPreparation = (id) => preparationIds.has(id)
  const scheduled = scheduleFeatures(
    /** @type {any} */ (
      entries.map(({ feature }) => ({
        ...feature,
        requires: (feature.requires ?? []).filter(requiresPreparation),
        after: (feature.after ?? []).filter(requiresPreparedFeature),
        optionalAfter: (feature.optionalAfter ?? []).filter(hasPreparation),
        hooks: {},
      }))
    ),
    diagnostics,
  )
  if (diagnostics.hasErrors()) {
    throw new ViteEnvironmentPreparationError(diagnostics.snapshot())
  }

  const byId = new Map(entries.map((entry) => [entry.feature?.id, entry]))
  for (const feature of scheduled) {
    await byId.get(feature.id)?.prepareClient(preparation)
  }
}
