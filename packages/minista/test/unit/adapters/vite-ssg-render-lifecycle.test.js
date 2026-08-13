import { describe, expect, test, vi } from "vitest"

import { renderViteSsgPages } from "../../../src/adapters/vite/ssg-render-lifecycle.js"
import {
  DiagnosticCollector,
  MemoryArtifactStore,
  ProjectGraph,
  createNodeId,
  toProjectPath,
} from "../../../src/core/index.js"
import { createRenderedPagesArtifactId } from "../../../src/features/ssg/index.js"

function createFixtureGraph() {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph({
    id: createNodeId("project", "ssg-render-fixture"),
    name: "ssg-render-fixture",
    root: toProjectPath("."),
  }, diagnostics)
  const featureId = createNodeId("feature", "ssg")
  const routeId = createNodeId("route", "src/pages/index.jsx")
  graph.addFeature({
    id: featureId,
    apiVersion: 1,
    provides: ["routes", "pages", "html"],
    requires: [],
  })
  graph.addRoute({
    id: routeId,
    sourceFile: toProjectPath("src/pages/index.jsx"),
    pattern: "/",
    params: [],
    pageModuleId: "/src/pages/index.jsx",
  })
  graph.addPage({
    id: createNodeId("page", routeId, "/"),
    routeId,
    url: "/",
    params: {},
    props: { title: "Home" },
    metadata: {},
    draft: false,
  })
  graph.addPage({
    id: createNodeId("page", routeId, "/draft/"),
    routeId,
    url: "/draft/",
    params: {},
    props: {},
    metadata: {},
    draft: true,
  })
  return graph.snapshot()
}

describe("Vite SSG render lifecycle", () => {
  test("renders non-draft Page Graph nodes into a rendered-pages artifact", async () => {
    const artifacts = new MemoryArtifactStore()
    /** @type {string[]} */
    const traces = []
    const render = vi.fn(async (page) => `<h1>${page.props.title}</h1>`)
    const result = await renderViteSsgPages(
      createFixtureGraph(),
      { render },
      {
        artifacts,
        onTrace(event) {
          traces.push(event.type)
        },
      },
    )

    expect(render).toHaveBeenCalledOnce()
    expect(result.pages).toEqual([{
      url: "/",
      fileName: "index.html",
      html: "<h1>Home</h1>",
    }])
    expect(await artifacts.get(createRenderedPagesArtifactId())).toMatchObject({
      owner: createNodeId("feature", "ssg"),
      mediaType: "application/vnd.minista.rendered-pages+json",
    })
    expect(result.graph.artifacts.get(createRenderedPagesArtifactId()))
      .toMatchObject({ kind: "data", owner: createNodeId("feature", "ssg") })
    expect(traces).toEqual([
      "phase:start",
      "feature:start",
      "feature:end",
      "phase:end",
    ])
  })

  test("replaces rendered pages in a long-lived artifact store", async () => {
    const artifacts = new MemoryArtifactStore()
    await renderViteSsgPages(createFixtureGraph(), {
      render: async () => "<h1>First</h1>",
    }, { artifacts })

    const result = await renderViteSsgPages(createFixtureGraph(), {
      render: async () => "<h1>Second</h1>",
    }, { artifacts })

    expect(result.pages[0]?.html).toBe("<h1>Second</h1>")
    expect(JSON.parse(String(
      (await artifacts.get(createRenderedPagesArtifactId()))?.content,
    ))[0].html).toBe("<h1>Second</h1>")
  })

  test("surfaces render failures as structured adapter diagnostics", async () => {
    await expect(renderViteSsgPages(createFixtureGraph(), {
      render: async () => {
        throw new Error("render failed")
      },
    })).rejects.toMatchObject({
      code: "MINISTA_VITE_SSG_RENDER_FAILED",
      diagnostics: [expect.objectContaining({
        code: "MINISTA_RENDER_FAILED",
        phase: "render",
        feature: createNodeId("feature", "ssg"),
      })],
    })
  })
})
