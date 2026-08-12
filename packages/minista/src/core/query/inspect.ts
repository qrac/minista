import type { ProjectGraphSnapshot } from "../graph/index.js"
import type { ProjectInspection } from "./types.js"

export function inspectProject(
  graph: ProjectGraphSnapshot,
): ProjectInspection {
  const pagesByRoute = new Map<string, string[]>()
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
    routes: Object.freeze(
      [...graph.routes.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((route) =>
          Object.freeze({
            id: route.id,
            pattern: route.pattern,
            sourceFile: route.sourceFile,
            pageIds: Object.freeze(
              [...(pagesByRoute.get(route.id) ?? [])].sort(),
            ),
          }),
        ),
    ),
  })
}
