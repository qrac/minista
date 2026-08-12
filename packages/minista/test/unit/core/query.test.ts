import { describe, expect, test } from "vitest"

import {
  DiagnosticCollector,
  ProjectGraph,
  createCommandResult,
  createNodeId,
  explainProjectNode,
  inspectProject,
  toProjectPath,
} from "../../../src/core/index.js"

function fixtureGraph() {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph(
    {
      id: createNodeId("project", "fixture"),
      name: "fixture",
      root: toProjectPath("."),
    },
    diagnostics,
  )
  const routeId = createNodeId("route", "src/pages/index.tsx")
  graph.addRoute({
    id: routeId,
    sourceFile: toProjectPath("src/pages/index.tsx"),
    pattern: "/",
    params: [],
    pageModuleId: "/src/pages/index.tsx",
  })
  graph.addPage({
    id: createNodeId("page", "/"),
    routeId,
    url: "/",
    params: {},
    props: {},
    metadata: {},
    draft: false,
  })
  return { graph, diagnostics, routeId }
}

describe("project query service", () => {
  test("returns a deterministic inspect projection", () => {
    const { graph } = fixtureGraph()
    const inspection = inspectProject(graph.snapshot())

    expect(inspection.counts).toMatchObject({ routes: 1, pages: 1 })
    expect(inspection.routes).toEqual([
      {
        id: "route:src/pages/index.tsx",
        pattern: "/",
        sourceFile: "src/pages/index.tsx",
        pageIds: ["page:/"],
      },
    ])
  })

  test("explains graph edges and wraps JSON command results", () => {
    const { graph, diagnostics, routeId } = fixtureGraph()
    const explanation = explainProjectNode(graph.snapshot(), routeId)
    const command = createCommandResult("explain", explanation, diagnostics)

    expect(command).toEqual({
      schemaVersion: "1",
      command: "explain",
      ok: true,
      data: {
        target: routeId,
        kind: "route",
        found: true,
        summary: "/ is discovered from src/pages/index.tsx.",
        relatedNodeIds: ["page:/"],
      },
      diagnostics: [],
    })
  })
})
