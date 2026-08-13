// @ts-check

/** @typedef {import("../graph/index.js").ProjectGraphSnapshot} ProjectGraphSnapshot */
/** @typedef {import("../manifest/index.js").ProjectManifest} ProjectManifest */
/** @typedef {import("./types.js").ProjectInspection} ProjectInspection */

/**
 * @param {ProjectGraphSnapshot} graph
 * @returns {ProjectInspection}
 */
export function inspectProject(graph) {
  const pagesByRoute = new Map()
  for (const page of graph.pages.values()) {
    const ids = pagesByRoute.get(page.routeId) ?? []
    ids.push(page.id)
    pagesByRoute.set(page.routeId, ids)
  }
  return Object.freeze({
    schemaVersion: "1",
    project: Object.freeze({
      id: graph.project.id,
      name: graph.project.name,
    }),
    counts: Object.freeze({
      features: graph.features.size,
      routes: graph.routes.size,
      pages: graph.pages.size,
      assets: graph.assets.size,
      islands: graph.islands.size,
      images: graph.images.size,
      artifacts: graph.artifacts.size,
    }),
    routes: Object.freeze([...graph.routes.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((route) => Object.freeze({
      id: route.id,
      pattern: route.pattern,
      sourceFile: route.sourceFile,
      pageIds: Object.freeze([...(pagesByRoute.get(route.id) ?? [])].sort()),
    }))),
  })
}

/**
 * user moduleを実行せず、公開manifestからinspect projectionを生成する。
 *
 * @param {ProjectManifest} manifest
 * @returns {ProjectInspection}
 */
export function inspectProjectManifest(manifest) {
  const pagesByRoute = new Map()
  for (const page of manifest.pages) {
    const ids = pagesByRoute.get(page.routeId) ?? []
    ids.push(page.id)
    pagesByRoute.set(page.routeId, ids)
  }
  return Object.freeze({
    schemaVersion: "1",
    project: Object.freeze({
      id: manifest.project.id,
      name: manifest.project.name,
    }),
    counts: Object.freeze({
      features: manifest.features.length,
      routes: manifest.routes.length,
      pages: manifest.pages.length,
      assets: manifest.assets.length,
      islands: manifest.assets.filter(({ kind }) => kind === "island").length,
      images: manifest.assets.filter(({ kind }) => kind === "image").length,
      artifacts: manifest.artifacts.length,
    }),
    routes: Object.freeze(manifest.routes.map((route) => Object.freeze({
      id: route.id,
      pattern: route.pattern,
      sourceFile: route.sourceFile,
      pageIds: Object.freeze([...(pagesByRoute.get(route.id) ?? [])].sort()),
    }))),
  })
}
