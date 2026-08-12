// @ts-check

/** @typedef {import("../graph/index.js").ProjectGraphSnapshot} ProjectGraphSnapshot */
/** @typedef {import("./types.js").ProjectManifest} ProjectManifest */
/** @typedef {import("./create.js").CreateManifestOptions} CreateManifestOptions */

/**
 * @template Key
 * @template {{readonly id: string}} Value
 * @param {ReadonlyMap<Key, Value>} map
 */
function sortedValues(map) {
  return [...map.values()].sort((left, right) => left.id.localeCompare(right.id))
}
/**
 * runtime-onlyのpropsや絶対pathを除外したmanifestを生成する。
 *
 * @param {ProjectGraphSnapshot} graph
 * @param {CreateManifestOptions} options
 * @returns {ProjectManifest}
 */
export function createProjectManifest(graph, options) {
  return Object.freeze({
    schemaVersion: "1",
    generator: Object.freeze({ name: "minista", version: options.version }),
    project: Object.freeze({
      id: graph.project.id,
      name: graph.project.name,
      root: ".",
    }),
    features: Object.freeze(sortedValues(graph.features).map((feature) => Object.freeze({
      id: feature.id,
      apiVersion: feature.apiVersion,
      provides: Object.freeze([...feature.provides].sort()),
      requires: Object.freeze([...feature.requires].sort()),
    }))),
    routes: Object.freeze(sortedValues(graph.routes).map((route) => Object.freeze({
      id: route.id,
      sourceFile: route.sourceFile,
      pattern: route.pattern,
      params: Object.freeze(route.params.map((param) => Object.freeze({ ...param }))),
    }))),
    pages: Object.freeze(sortedValues(graph.pages).map((page) => Object.freeze({
      id: page.id,
      routeId: page.routeId,
      url: page.url,
      params: Object.freeze({ ...page.params }),
      draft: page.draft,
    }))),
    assets: Object.freeze(sortedValues(graph.assets).map((asset) => Object.freeze({
      id: asset.id,
      kind: asset.kind,
      ...(asset.source ? { source: asset.source } : {}),
      ...(asset.contentHash ? { contentHash: asset.contentHash } : {}),
      consumers: Object.freeze([...asset.consumers].sort()),
      ...(asset.output ? { output: Object.freeze({ ...asset.output }) } : {}),
    }))),
    artifacts: Object.freeze(sortedValues(graph.artifacts).map((artifact) => Object.freeze({
      id: artifact.id,
      kind: artifact.kind,
      owner: artifact.owner,
      ...(artifact.output ? { output: Object.freeze({ ...artifact.output }) } : {}),
      dependencies: Object.freeze([...artifact.dependencies].sort()),
    }))),
    diagnosticSummary: Object.freeze({ ...options.diagnostics }),
    createdAt: options.createdAt,
  })
}
