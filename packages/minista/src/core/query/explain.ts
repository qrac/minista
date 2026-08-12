import type { ProjectGraphSnapshot } from "../graph/index.js"
import type { Explanation } from "./types.js"

function result(
  explanation: Omit<Explanation, "target">,
  target: string,
): Explanation {
  return Object.freeze({
    target,
    ...explanation,
    relatedNodeIds: Object.freeze([...explanation.relatedNodeIds].sort()),
  })
}

export function explainProjectNode(
  graph: ProjectGraphSnapshot,
  target: string,
): Explanation {
  const route = graph.routes.get(target as never)
  if (route) {
    const pages = [...graph.pages.values()]
      .filter((page) => page.routeId === route.id)
      .map(({ id }) => id)
    return result(
      {
        kind: "route",
        found: true,
        summary: `${route.pattern} is discovered from ${route.sourceFile}.`,
        relatedNodeIds: pages,
      },
      target,
    )
  }

  const page = graph.pages.get(target as never)
  if (page) {
    const artifacts = [...graph.artifacts.values()]
      .filter((artifact) => artifact.source === page.id)
      .map(({ id }) => id)
    return result(
      {
        kind: "page",
        found: true,
        summary: `${page.url} is generated from ${page.routeId}.`,
        relatedNodeIds: [page.routeId, ...artifacts],
      },
      target,
    )
  }

  const asset = graph.assets.get(target as never)
  if (asset) {
    return result(
      {
        kind: "asset",
        found: true,
        summary: `${asset.id} is a ${asset.kind} asset${asset.output ? ` emitted as ${asset.output.fileName}` : ""}.`,
        relatedNodeIds: asset.consumers,
      },
      target,
    )
  }

  const artifact = graph.artifacts.get(target as never)
  if (artifact) {
    return result(
      {
        kind: "artifact",
        found: true,
        summary: `${artifact.id} is owned by ${artifact.owner}.`,
        relatedNodeIds: [artifact.owner, ...artifact.dependencies],
      },
      target,
    )
  }

  const routes = [...graph.routes.values()].filter(
    ({ sourceFile }) => sourceFile === target,
  )
  if (routes.length > 0) {
    return result(
      {
        kind: "file",
        found: true,
        summary: `${target} defines ${routes.length} route${routes.length === 1 ? "" : "s"}.`,
        relatedNodeIds: routes.map(({ id }) => id),
      },
      target,
    )
  }

  return result(
    {
      kind: "unknown",
      found: false,
      summary: `No project graph node matches ${target}.`,
      relatedNodeIds: [],
    },
    target,
  )
}
