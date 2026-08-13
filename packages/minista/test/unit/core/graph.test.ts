import { describe, expect, test } from "vitest"

import {
  DiagnosticCollector,
  ProjectGraph,
  createNodeId,
  createOutputManifest,
  applyOutputClaims,
  createProjectManifest,
  toProjectPath,
} from "../../../src/core/index.js"

function createGraph() {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph(
    {
      id: createNodeId("project", "fixture"),
      name: "fixture",
      root: toProjectPath("."),
    },
    diagnostics,
  )
  return { graph, diagnostics }
}

describe("ProjectGraph", () => {
  test("normalizes safe project paths", () => {
    expect(toProjectPath("./src\\pages//index.tsx")).toBe(
      "src/pages/index.tsx",
    )
    expect(() => toProjectPath("../secret.txt")).toThrow("escape the root")
  })

  test("diagnoses duplicate route patterns without mutating the graph", () => {
    const { graph, diagnostics } = createGraph()
    graph.addRoute({
      id: createNodeId("route", "src/pages/a.tsx"),
      sourceFile: toProjectPath("src/pages/a.tsx"),
      pattern: "/same/",
      params: [],
      pageModuleId: "/src/pages/a.tsx",
    })
    graph.addRoute({
      id: createNodeId("route", "src/pages/b.tsx"),
      sourceFile: toProjectPath("src/pages/b.tsx"),
      pattern: "/same/",
      params: [],
      pageModuleId: "/src/pages/b.tsx",
    })

    expect(graph.snapshot().routes.size).toBe(1)
    expect(diagnostics.byCode("MINISTA_ROUTE_DUPLICATE")).toHaveLength(1)
  })

  test("creates a safe manifest projection without props or absolute roots", () => {
    const { graph, diagnostics } = createGraph()
    const featureId = createNodeId("feature", "ssg")
    const routeId = createNodeId("route", "src/pages/index.tsx")
    graph.addFeature({
      id: featureId,
      apiVersion: 1,
      provides: ["pages"],
      requires: [],
    })
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
      props: { secret: "must-not-be-serialized", callback: () => undefined },
      metadata: { internal: new Date(0) },
      draft: false,
    })

    const snapshot = {
      ...graph.snapshot(),
      config: {
        apiToken: "must-not-be-serialized",
        absoluteCacheDir: process.cwd(),
      },
    }
    const manifest = createProjectManifest(snapshot, {
      version: "5.0.0",
      createdAt: "2026-08-12T00:00:00.000Z",
      diagnostics: diagnostics.summary(),
      outputManifest: createOutputManifest("client", [{
        logicalId: "index.html",
        kind: "asset",
        fileName: "index.html",
        url: "/index.html",
        byteSize: 42,
      }]),
    })
    const json = JSON.stringify(manifest)

    expect(manifest.project.root).toBe(".")
    expect(manifest.pages[0]).toEqual({
      id: "page:/",
      routeId: "route:src/pages/index.tsx",
      url: "/",
      params: {},
      draft: false,
      output: { fileName: "index.html", url: "/index.html" },
    })
    expect(manifest.outputs).toEqual([{
      logicalId: "index.html",
      kind: "asset",
      fileName: "index.html",
      url: "/index.html",
      byteSize: 42,
    }])
    expect(json).not.toContain("must-not-be-serialized")
    expect(json).not.toContain("apiToken")
    expect(json).not.toContain(process.cwd())
  })

  test("materializes verified output claims as graph edges", () => {
    const { graph, diagnostics } = createGraph()
    const featureId = createNodeId("feature", "ssg")
    const routeId = createNodeId("route", "src/pages/index.tsx")
    const pageId = createNodeId("page", "/")
    graph.addFeature({
      id: featureId,
      apiVersion: 1,
      provides: ["pages"],
      requires: [],
    })
    graph.addRoute({
      id: routeId,
      sourceFile: toProjectPath("src/pages/index.tsx"),
      pattern: "/",
      params: [],
      pageModuleId: "/src/pages/index.tsx",
    })
    graph.addPage({
      id: pageId,
      routeId,
      url: "/",
      params: {},
      props: {},
      metadata: {},
      draft: false,
    })
    const outputs = createOutputManifest("client", [{
      logicalId: "index.html",
      kind: "asset",
      fileName: "index.html",
      url: "/index.html",
      byteSize: 10,
    }])
    const artifactId = createNodeId("artifact", "ssg-output", pageId)
    const claimed = applyOutputClaims(
      graph.snapshot(),
      [{
        id: artifactId,
        kind: "html",
        owner: featureId,
        source: `page:${pageId}`,
        fileName: "index.html",
        pageUrls: ["/"],
        dependencies: [],
      }],
      [],
      outputs,
      diagnostics,
    )

    expect(claimed.artifacts.get(artifactId)?.output).toEqual({
      fileName: "index.html",
      url: "/index.html",
    })
    expect([...claimed.assets.values()][0]?.consumers).toEqual([pageId])
    applyOutputClaims(
      graph.snapshot(),
      [{
        id: createNodeId("artifact", "missing"),
        kind: "data",
        owner: featureId,
        source: "missing",
        fileName: "missing.json",
        pageUrls: [],
        dependencies: [],
      }],
      [],
      outputs,
      diagnostics,
    )
    expect(diagnostics.byCode("MINISTA_OUTPUT_CLAIM_NOT_FOUND"))
      .toHaveLength(1)
  })
})
