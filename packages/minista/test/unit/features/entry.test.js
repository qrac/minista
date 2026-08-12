import { describe, expect, test, vi } from "vitest"

import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import {
  DiagnosticCollector,
  LifecycleRunner,
  MemoryArtifactStore,
  MemoryEmitter,
  MemoryHtmlDocumentStore,
  ProjectGraph,
  createNodeId,
  toProjectPath,
} from "../../../src/core/index.js"
import {
  ENTRY_FEATURE_ID,
  collectEntryReferences,
  createEntryFeature,
} from "../../../src/features/entry/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("entry feature", () => {
  test("analyzes root assets, bundles them, and composes output URLs", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const routeId = createNodeId("route", "src/pages/index.jsx")
    const pageId = createNodeId("page", routeId, "/")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "entry-fixture"),
        name: "entry-fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    )
    graph.addFeature({
      id: createNodeId("feature", "ssg"),
      apiVersion: 1,
      provides: ["html-documents"],
      requires: [],
    })
    graph.addFeature({
      id: ENTRY_FEATURE_ID,
      apiVersion: 1,
      provides: ["asset-entries"],
      requires: ["html-documents"],
    })
    graph.addRoute({
      id: routeId,
      sourceFile: toProjectPath("src/pages/index.jsx"),
      pattern: "/",
      params: [],
      pageModuleId: "/src/pages/index.jsx",
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
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: '<html><head><link rel="stylesheet" href="/src/site.css?theme=dark"><script src="/src/app.js"></script></head><body><img srcset="/src/a.png 1x, /src/b.png 2x"><a href="https://example.com">External</a></body></html>',
    })
    documents.put(document)
    const references = collectEntryReferences(document)
    const bundler = {
      bundle: vi.fn(async () => [
        {
          source: "src/site.css",
          fileName: "assets/site.css",
          cssFiles: [],
        },
        {
          source: "src/app.js",
          fileName: "scripts/app.js",
          cssFiles: ["assets/app.css"],
        },
        {
          source: "src/a.png",
          fileName: "assets/a.png",
          cssFiles: [],
        },
        {
          source: "src/b.png",
          fileName: "assets/b.png",
          cssFiles: [],
        },
      ]),
    }
    const provider = {
      id: createNodeId("feature", "ssg"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents")],
      hooks: {},
    }
    const runner = new LifecycleRunner(
      [
        createEntryFeature({}, bundler, {
          resolve: (fileName) => `/${fileName}`,
        }),
        provider,
      ],
      {
        graph,
        diagnostics,
        documents,
        artifacts,
        emitter: new MemoryEmitter(),
      },
    )

    const result = await runner.run({
      phases: ["analyze", "bundle", "compose"],
    })
    const html = document.serialize()

    expect(references.map(({ source }) => source)).toEqual([
      "src/site.css",
      "src/app.js",
      "src/a.png",
      "src/b.png",
    ])
    expect(result.ok).toBe(true)
    expect(bundler.bundle).toHaveBeenCalledOnce()
    expect(html).toContain('href="/assets/site.css?theme=dark"')
    expect(html).toContain('src="/scripts/app.js"')
    expect(html).toContain(
      'srcset="/assets/a.png 1x, /assets/b.png 2x"',
    )
    expect(html).toContain('<link rel="stylesheet" href="/assets/app.css">')
    expect(graph.snapshot().assets.get(createNodeId("asset", "src/app.js")))
      .toMatchObject({ consumers: [pageId] })
  })
})
