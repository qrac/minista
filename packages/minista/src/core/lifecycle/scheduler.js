// @ts-check

/** @typedef {import("../diagnostics/index.js").DiagnosticCollector} DiagnosticCollector */
/** @typedef {import("./types.js").MinistaFeature} MinistaFeature */

/**
 * capabilityと`after`からfeatureの実行順を決定する。
 *
 * @param {readonly MinistaFeature[]} features
 * @param {DiagnosticCollector} diagnostics
 * @returns {readonly MinistaFeature[]}
 */
export function scheduleFeatures(features, diagnostics) {
  const byId = new Map()
  for (const feature of features) {
    if (byId.has(feature.id)) {
      diagnostics.error({
        code: "MINISTA_FEATURE_DUPLICATE",
        message: `Feature ${feature.id} is registered more than once.`,
        feature: feature.id,
      })
      continue
    }
    byId.set(feature.id, feature)
  }
  const providers = new Map()
  for (const feature of byId.values()) {
    for (const capability of feature.provides ?? []) {
      const ids = providers.get(capability) ?? []
      ids.push(feature.id)
      providers.set(capability, ids)
    }
  }
  const dependencies = new Map()
  for (const feature of byId.values()) {
    const required = new Set()
    for (const dependency of feature.after ?? []) {
      if (!byId.has(dependency)) {
        diagnostics.error({
          code: "MINISTA_FEATURE_DEPENDENCY_MISSING",
          message: `Feature ${feature.id} must run after unknown feature ${dependency}.`,
          feature: feature.id,
        })
      }
      else if (dependency !== feature.id) {
        required.add(dependency)
      }
    }
    for (const capability of feature.requires ?? []) {
      const capabilityProviders = providers.get(capability) ?? []
      if (capabilityProviders.length === 0) {
        diagnostics.error({
          code: "MINISTA_FEATURE_CAPABILITY_MISSING",
          message: `Feature ${feature.id} requires unavailable capability ${capability}.`,
          feature: feature.id,
        })
      }
      for (const provider of capabilityProviders) {
        if (provider !== feature.id)
          required.add(provider)
      }
    }
    dependencies.set(feature.id, required)
  }
  if (diagnostics.hasErrors())
    return Object.freeze([])
  const result = []
  const remaining = new Set(byId.keys())
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((id) => [...(dependencies.get(id) ?? [])].every((dependency) => !remaining.has(dependency)))
      .sort((left, right) => left.localeCompare(right))
    if (ready.length === 0) {
      diagnostics.error({
        code: "MINISTA_FEATURE_CYCLE",
        message: `Feature dependency cycle detected: ${[...remaining].sort().join(", ")}.`,
      })
      return Object.freeze([])
    }
    for (const id of ready) {
      remaining.delete(id)
      const feature = byId.get(id)
      if (feature)
        result.push(feature)
    }
  }
  return Object.freeze(result)
}
