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

  test("keeps route and page indexes consistent across updates, removals, and restore", () => {
    const { graph, diagnostics } = createGraph()
    const routeId = createNodeId("route", "src/pages/a.tsx")
    const pageId = createNodeId("page", "/a/")
    graph.addRoute({
      id: routeId,
      sourceFile: toProjectPath("src/pages/a.tsx"),
      pattern: "/a/",
      params: [],
      pageModuleId: "/src/pages/a.tsx",
    })
    graph.addPage({
      id: pageId,
      routeId,
      url: "/a/",
      params: {},
      props: {},
      metadata: {},
      draft: false,
    })

    expect(graph.getRouteByPattern("/a/")?.id).toBe(routeId)
    expect(graph.getPageByUrl("/a/")?.id).toBe(pageId)
    expect(graph.getRouteIdByPattern("/a/")).toBe(routeId)
    expect(graph.getPageIdByUrl("/a/")).toBe(pageId)
    expect([...graph.listPages()].map(({ id }) => id)).toEqual([pageId])
    graph.updateRoute({
      ...graph.getRoute(routeId)!,
      pattern: "/renamed/",
    })
    graph.updatePage({
      ...graph.getPage(pageId)!,
      url: "/renamed/",
    })
    expect(graph.getRouteByPattern("/a/")).toBeUndefined()
    expect(graph.getPageByUrl("/a/")).toBeUndefined()
    expect(graph.getRouteByPattern("/renamed/")?.id).toBe(routeId)
    expect(graph.getPageByUrl("/renamed/")?.id).toBe(pageId)

    const restored = ProjectGraph.fromSnapshot(graph.snapshot(), diagnostics)
    expect(restored.getRouteByPattern("/renamed/")?.id).toBe(routeId)
    expect(restored.getPageByUrl("/renamed/")?.id).toBe(pageId)
    expect(restored.removePage(pageId)).toBe(true)
    expect(restored.getPageByUrl("/renamed/")).toBeUndefined()
    expect(restored.removeRoute(routeId)).toBe(true)
    expect(restored.getRouteByPattern("/renamed/")).toBeUndefined()
  })

  test("rejects conflicting index updates without changing existing nodes", () => {
    const { graph, diagnostics } = createGraph()
    const routeA = createNodeId("route", "a")
    const routeB = createNodeId("route", "b")
    for (const [id, pattern] of [[routeA, "/a/"], [routeB, "/b/"]] as const) {
      graph.addRoute({ id, sourceFile: toProjectPath(`${id}.tsx`), pattern, params: [], pageModuleId: `/${id}.tsx` })
    }
    const pageA = createNodeId("page", "a")
    const pageB = createNodeId("page", "b")
    for (const [id, routeId, url] of [[pageA, routeA, "/a/"], [pageB, routeB, "/b/"]] as const) {
      graph.addPage({ id, routeId, url, params: {}, props: {}, metadata: {}, draft: false })
    }

    graph.updateRoute({ ...graph.getRoute(routeB)!, pattern: "/a/" })
    graph.updatePage({ ...graph.getPage(pageB)!, url: "/a/" })
    expect(graph.getRoute(routeB)?.pattern).toBe("/b/")
    expect(graph.getPage(pageB)?.url).toBe("/b/")
    expect(diagnostics.byCode("MINISTA_ROUTE_DUPLICATE")).toHaveLength(1)
    expect(diagnostics.byCode("MINISTA_PAGE_URL_DUPLICATE")).toHaveLength(1)
  })

  test("removes page references and page-scoped artifacts", () => {
    const { graph } = createGraph()
    const featureId = createNodeId("feature", "fixture")
    const routeId = createNodeId("route", "shared")
    const pageA = createNodeId("page", "a")
    const pageB = createNodeId("page", "b")
    const assetId = createNodeId("asset", "shared")
    const islandId = createNodeId("island", "shared")
    const imageId = createNodeId("image", "shared")
    const pageArtifactA = createNodeId("artifact", "page-a")
    const pageArtifactB = createNodeId("artifact", "page-b")
    const buildArtifact = createNodeId("artifact", "build")
    graph.addFeature({ id: featureId, apiVersion: 1, provides: [], requires: [] })
    graph.addRoute({
      id: routeId,
      sourceFile: toProjectPath("src/pages/[slug].tsx"),
      pattern: "/:slug/",
      params: [{ name: "slug", optional: false, rest: false }],
      pageModuleId: "/src/pages/[slug].tsx",
    })
    for (const [id, url] of [[pageA, "/a/"], [pageB, "/b/"]] as const) {
      graph.addPage({ id, routeId, url, params: {}, props: {}, metadata: {}, draft: false })
    }
    graph.addAsset({ id: assetId, kind: "generated", consumers: [pageA, pageB] })
    graph.addIsland({ id: islandId, componentModuleId: "/island.jsx", directive: "load", pages: [pageA, pageB] })
    graph.addImage({ id: imageId, source: "/image.png", pages: [pageA, pageB], generatedAssets: [assetId] })
    graph.addArtifact({ id: pageArtifactA, kind: "data", owner: featureId, source: "a", dependencies: [], scope: { kind: "page", pageId: pageA } })
    graph.addArtifact({ id: pageArtifactB, kind: "data", owner: featureId, source: "b", dependencies: [], scope: { kind: "page", pageId: pageB } })
    graph.addArtifact({ id: buildArtifact, kind: "data", owner: featureId, source: "build", dependencies: [pageArtifactA, pageArtifactB] })

    expect(graph.removePage(pageA)).toBe(true)
    let snapshot = graph.snapshot()
    expect(snapshot.assets.get(assetId)?.consumers).toEqual([pageB])
    expect(snapshot.islands.get(islandId)?.pages).toEqual([pageB])
    expect(snapshot.images.get(imageId)?.pages).toEqual([pageB])
    expect(snapshot.artifacts.has(pageArtifactA)).toBe(false)
    expect(snapshot.artifacts.get(buildArtifact)?.dependencies).toEqual([pageArtifactB])

    expect(graph.removeRoute(routeId)).toBe(true)
    snapshot = graph.snapshot()
    expect(snapshot.pages.size).toBe(0)
    expect(snapshot.assets.get(assetId)?.consumers).toEqual([])
    expect(snapshot.islands.get(islandId)?.pages).toEqual([])
    expect(snapshot.images.get(imageId)?.pages).toEqual([])
    expect(snapshot.artifacts.has(pageArtifactB)).toBe(false)
    expect(snapshot.artifacts.get(buildArtifact)?.dependencies).toEqual([])
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
