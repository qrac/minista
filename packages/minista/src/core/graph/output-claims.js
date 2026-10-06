// @ts-check

import { createNodeId } from "./ids.js"

/**
 * @param {import("./types.js").ProjectGraphSnapshot} graph
 * @param {readonly import("./output-claims.js").OutputClaim[]} claims
 * @param {readonly import("./types.js").FeatureNode[]} features
 * @param {import("../manifest/index.js").OutputManifest} outputManifest
 * @param {import("../diagnostics/index.js").DiagnosticCollector} diagnostics
 * @returns {import("./types.js").ProjectGraphSnapshot}
 */
export function applyOutputClaims(
  graph,
  claims,
  features,
  outputManifest,
  diagnostics,
) {
  const featureMap = new Map(graph.features)
  const assetMap = new Map(graph.assets)
  const artifactMap = new Map(graph.artifacts)
  const outputs = new Map(
    outputManifest.files.map((output) => [output.fileName, output]),
  )
  const pageIdsByUrl = new Map(
    [...graph.pages.values()].map((page) => [page.url, page.id]),
  )
  for (const feature of features) {
    if (!featureMap.has(feature.id)) {
      featureMap.set(feature.id, Object.freeze({ ...feature }))
    }
  }
  for (const claim of [...claims].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    const output = outputs.get(claim.fileName)
    if (!output) {
      diagnostics.warning({
        code: "MINISTA_OUTPUT_CLAIM_NOT_FOUND",
        message: `Output claim ${claim.id} references missing file ${claim.fileName}.`,
        hint: "Declare output claims only after the client bundle is finalized.",
        phase: "emit",
        feature: claim.owner,
        nodeId: claim.id,
      })
      continue
    }
    if (!featureMap.has(claim.owner)) {
      diagnostics.warning({
        code: "MINISTA_OUTPUT_CLAIM_OWNER_NOT_FOUND",
        message: `Output claim ${claim.id} references unknown feature ${claim.owner}.`,
        phase: "emit",
        feature: claim.owner,
        nodeId: claim.id,
      })
      continue
    }
    const location = Object.freeze({
      fileName: output.fileName,
      url: output.url,
    })
    artifactMap.set(claim.id, Object.freeze({
      id: claim.id,
      kind: claim.kind,
      owner: claim.owner,
      source: claim.source,
      output: location,
      dependencies: Object.freeze([...claim.dependencies].sort()),
    }))
    const consumers = claim.pageUrls.flatMap((url) => {
      const pageId = pageIdsByUrl.get(url)
      return pageId ? [pageId] : []
    })
    const assetId = createNodeId("asset", "output", claim.id)
    assetMap.set(assetId, Object.freeze({
      id: assetId,
      kind: "generated",
      consumers: Object.freeze([...new Set(consumers)].sort()),
      output: location,
    }))
  }
  return Object.freeze({
    ...graph,
    features: featureMap,
    assets: assetMap,
    artifacts: artifactMap,
  })
}
