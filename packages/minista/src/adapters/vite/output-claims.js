// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/**
 * @param {readonly import("vite").Plugin[]} plugins
 * @returns {Promise<import("./output-claims.js").ViteOutputClaimCollection>}
 */
export async function collectViteOutputClaims(plugins) {
  /** @type {import("../../core/graph/index.js").FeatureNode[]} */
  const features = []
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  const claims = []
  for (const plugin of plugins) {
    const minista = /** @type {import("./output-claims.js").MinistaOutputClaimApi | undefined} */ (
      plugin.api?.minista
    )
    const feature = minista?.feature
    if (feature) {
      features.push(Object.freeze({
        id: createNodeId("feature", feature.id),
        apiVersion: 1,
        provides: Object.freeze([...feature.provides]),
        requires: Object.freeze([...feature.requires]),
      }))
    }
    if (minista?.outputClaims) {
      claims.push(...await minista.outputClaims())
    }
  }
  return Object.freeze({
    features: Object.freeze(features),
    claims: Object.freeze(claims),
  })
}
