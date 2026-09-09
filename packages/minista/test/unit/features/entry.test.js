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
  composeEntryDocument,
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


test("collection and composition share element and URL boundaries", () => {
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "references"),
    html: `<html><head><link href="/src/a.svg?q=1#icon"><meta content="/src/a.svg"></head><body>
      <script src=" /src/a.svg?q=1#icon "></script>
      <img src="/src/a.svg"><img src="//cdn.test/src/a.svg">
      <img src="https://cdn.test/src/a.svg"><img src="./src/a.svg">
      <img src="data:image/svg+xml,/src/a.svg"><img src="/src/a.svg-more">
      <img srcset="data:image/svg+xml,/src/a.svg 1x, /src/a.svg?q=2#x 2x, //cdn.test/a.svg 3x">
      <source srcset="/src/a.svg 320w, /src/b.svg 640w">
      <svg><use href="/src/a.svg#symbol"></use><use href="#local"></use><image href="/src/a.svg"></image></svg>
      <a href="/src/a.svg">Download</a><video poster="/src/a.svg" src="/src/a.svg"></video>
      <div content="/src/a.svg" src="/src/a.svg" href="/src/a.svg"></div>
    </body></html>`,
  })
  expect(collectEntryReferences(document).map(({ source, attribute }) => [source, attribute])).toEqual([
    ["src/a.svg", "href"], ["src/a.svg", "src"], ["src/a.svg-more", "src"],
    ["src/a.svg", "srcset"], ["src/b.svg", "srcset"],
  ])
  composeEntryDocument(document, [{ source: "src/a.svg", fileName: "assets/a.svg", cssFiles: [] }], { resolve: (file) => `../${file}` })
  const html = document.serialize()
  expect(html).toContain('href="../assets/a.svg?q=1#icon"')
  expect(html).toContain('src=" ../assets/a.svg?q=1#icon "')
  expect(html).toContain('data:image/svg+xml,/src/a.svg 1x, ../assets/a.svg?q=2#x 2x, //cdn.test/a.svg 3x')
  expect(html).toContain('srcset="../assets/a.svg 320w, /src/b.svg 640w"')
  expect(html).toContain('<use href="../assets/a.svg#symbol">')
  for (const unchanged of ['<meta content="/src/a.svg">', '<a href="/src/a.svg">', 'poster="/src/a.svg"', '<image href="/src/a.svg">', 'src="//cdn.test/src/a.svg"', 'src="/src/a.svg-more"']) expect(html).toContain(unchanged)
})

test("CSS is page-specific and deduplicated against explicit and shared styles", () => {
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "styles"),
    html: '<html><head><link rel="stylesheet" href="/src/shared.css"><script src="/src/a.js"></script><script src="/src/b.js"></script></head><body></body></html>',
  })
  const outputs = [
    { source: "src/a.js", fileName: "a.js", cssFiles: ["shared.css", "common.css"] },
    { source: "src/b.js", fileName: "b.js", cssFiles: ["common.css"] },
    { source: "src/other.js", fileName: "other.js", cssFiles: ["other.css"] },
    { source: "src/shared.css", fileName: "shared.css", cssFiles: [] },
  ]
  composeEntryDocument(document, outputs, { resolve: (file) => `/base/${file}` })
  expect(document.select('link[rel="stylesheet"]').map((el) => el.getAttribute("href"))).toEqual(["/base/shared.css", "/base/common.css"])
})

test("single URLs keep commas, srcset preserves data URLs and whitespace descriptors", () => {
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "commas"),
    html: '<img src="/src/a,b.png?q=x,y"><img srcset="data:image/png;base64,AAAA, /src/a.png\t1x,\n/src/b.png 2x">',
  })
  expect(collectEntryReferences(document).map(({ source }) => source)).toEqual(["src/a,b.png", "src/a.png", "src/b.png"])
})


test("generated URLs are never collected again during composition", () => {
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "overlap"),
    html: '<img srcset="/src/a.png 1x, /assets/a.png 2x">',
  })
  composeEntryDocument(document, [
    { source: "src/a.png", fileName: "assets/a.png", cssFiles: [] },
    { source: "assets/a.png", fileName: "assets/b.png", cssFiles: [] },
  ], { resolve: (file) => `/${file}` })
  expect(document.serialize()).toContain('srcset="/assets/a.png 1x, /assets/b.png 2x"')
})
