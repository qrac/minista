// @ts-check

/** @typedef {import("../graph/index.js").ProjectGraphSnapshot} ProjectGraphSnapshot */
/** @typedef {import("../graph/index.js").RouteId} RouteId */
/** @typedef {import("../graph/index.js").PageId} PageId */
/** @typedef {import("../graph/index.js").AssetId} AssetId */
/** @typedef {import("../graph/index.js").ArtifactId} ArtifactId */
/** @typedef {import("./types.js").Explanation} Explanation */

/**
 * @param {Omit<Explanation, "target">} explanation
 * @param {string} target
 * @returns {Explanation}
 */
function result(explanation, target) {
  return Object.freeze({
    target,
    ...explanation,
    relatedNodeIds: Object.freeze([...explanation.relatedNodeIds].sort()),
  })
}
/**
 * @param {ProjectGraphSnapshot} graph
 * @param {string} target
 * @returns {Explanation}
 */
export function explainProjectNode(graph, target) {
  const route = graph.routes.get(/** @type {RouteId} */ (target))
  if (route) {
    const pages = [...graph.pages.values()]
      .filter((page) => page.routeId === route.id)
      .map(({ id }) => id)
    return result({
      kind: "route",
      found: true,
      summary: `${route.pattern} is discovered from ${route.sourceFile}.`,
      relatedNodeIds: pages,
    }, target)
  }
  const page = graph.pages.get(/** @type {PageId} */ (target))
  if (page) {
    const artifacts = [...graph.artifacts.values()]
      .filter((artifact) => artifact.source === page.id)
      .map(({ id }) => id)
    return result({
      kind: "page",
      found: true,
      summary: `${page.url} is generated from ${page.routeId}.`,
      relatedNodeIds: [page.routeId, ...artifacts],
    }, target)
  }
  const asset = graph.assets.get(/** @type {AssetId} */ (target))
  if (asset) {
    return result({
      kind: "asset",
      found: true,
      summary: `${asset.id} is a ${asset.kind} asset${asset.output ? ` emitted as ${asset.output.fileName}` : ""}.`,
      relatedNodeIds: asset.consumers,
    }, target)
  }
  const artifact = graph.artifacts.get(/** @type {ArtifactId} */ (target))
  if (artifact) {
    return result({
      kind: "artifact",
      found: true,
      summary: `${artifact.id} is owned by ${artifact.owner}.`,
      relatedNodeIds: [artifact.owner, ...artifact.dependencies],
    }, target)
  }
  const routes = [...graph.routes.values()].filter(({ sourceFile }) => sourceFile === target)
  if (routes.length > 0) {
    return result({
      kind: "file",
      found: true,
      summary: `${target} defines ${routes.length} route${routes.length === 1 ? "" : "s"}.`,
      relatedNodeIds: routes.map(({ id }) => id),
    }, target)
  }
  return result({
    kind: "unknown",
    found: false,
    summary: `No project graph node matches ${target}.`,
    relatedNodeIds: [],
  }, target)
}
