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
      outputs: 0,
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
      outputs: manifest.outputs?.length ?? 0,
    }),
    routes: Object.freeze(manifest.routes.map((route) => Object.freeze({
      id: route.id,
      pattern: route.pattern,
      sourceFile: route.sourceFile,
      pageIds: Object.freeze([...(pagesByRoute.get(route.id) ?? [])].sort()),
    }))),
  })
}

/**
 * 公開manifestだけからPageと生成outputの関係を追跡する。
 *
 * @param {ProjectManifest} manifest
 * @param {string} target Page IDまたはURL
 * @returns {import("./types.js").ProjectPageTrace}
 */
export function traceProjectPage(manifest, target) {
  const page = manifest.pages.find((item) =>
    item.id === target || item.url === target
  )
  if (!page) {
    return Object.freeze({
      schemaVersion: /** @type {const} */ ("1"),
      target,
      found: false,
      assets: Object.freeze([]),
      artifacts: Object.freeze([]),
      outputs: Object.freeze([]),
    })
  }
  const route = manifest.routes.find(({ id }) => id === page.routeId)
  const assets = manifest.assets
    .filter(({ consumers }) => consumers.includes(page.id))
    .sort((left, right) => left.id.localeCompare(right.id))
  const outputFileNames = new Set([
    ...(page.output ? [page.output.fileName] : []),
    ...assets.flatMap(({ output }) => output ? [output.fileName] : []),
  ])
  const artifacts = manifest.artifacts
    .filter(({ output }) => output && outputFileNames.has(output.fileName))
    .sort((left, right) => left.id.localeCompare(right.id))
  for (const artifact of artifacts) {
    if (artifact.output) outputFileNames.add(artifact.output.fileName)
  }
  const outputs = (manifest.outputs ?? [])
    .filter(({ fileName }) => outputFileNames.has(fileName))
    .sort((left, right) => left.fileName.localeCompare(right.fileName))
  return Object.freeze({
    schemaVersion: /** @type {const} */ ("1"),
    target,
    found: true,
    page: Object.freeze({
      ...page,
      params: Object.freeze({ ...page.params }),
      ...(page.output ? { output: Object.freeze({ ...page.output }) } : {}),
    }),
    ...(route ? { route: Object.freeze({
      ...route,
      params: Object.freeze(route.params.map((param) =>
        Object.freeze({ ...param })
      )),
    }) } : {}),
    assets: Object.freeze(assets.map((asset) => Object.freeze({
      ...asset,
      consumers: Object.freeze([...asset.consumers]),
      ...(asset.output ? { output: Object.freeze({ ...asset.output }) } : {}),
    }))),
    artifacts: Object.freeze(artifacts.map((artifact) =>
      Object.freeze({
        ...artifact,
        dependencies: Object.freeze([...artifact.dependencies]),
        ...(artifact.output
          ? { output: Object.freeze({ ...artifact.output }) }
          : {}),
      })
    )),
    outputs: Object.freeze(outputs.map((output) => Object.freeze({
      ...output,
      ...(output.imports
        ? { imports: Object.freeze([...output.imports]) }
        : {}),
      ...(output.dynamicImports
        ? { dynamicImports: Object.freeze([...output.dynamicImports]) }
        : {}),
    }))),
  })
}
