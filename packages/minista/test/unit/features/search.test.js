import { describe, expect, test } from "vitest"

import {
  NodeHtmlDocumentFactory,
  NodeSearchDocumentAnalyzer,
} from "../../../src/adapters/html/index.js"
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
  SEARCH_FEATURE_ID,
  createSearchDataArtifactId,
  createSearchFeature,
} from "../../../src/features/search/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

const options = {
  outName: "search",
  src: ["**/*.html"],
  ignore: ["404.html"],
  trimTitle: " | Site",
  targetSelector: "[data-search]",
  ignoreSelectors: ["[data-search-ignore]"],
  relativeAttr: "data-search-relative",
  inputAttr: "data-search-input",
  hit: {
    minLength: 3,
    number: false,
    english: true,
    hiragana: false,
    katakana: true,
    kanji: true,
  },
}

describe("search feature", () => {
  test("analyzes documents, generates an artifact, and composes relative depth", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const routeId = createNodeId("route", "src/pages/index.jsx")
    const pageId = createNodeId("page", routeId, "/")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "search-fixture"),
        name: "search-fixture",
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
      id: SEARCH_FEATURE_ID,
      apiVersion: 1,
      provides: ["search-data"],
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
      html:
        '<html><head><title>Fixture | Site</title></head><body><main data-search><h1 id="intro">Hello World</h1><p>Search content</p><p data-search-ignore>Hidden</p><input data-search-input></main></body></html>',
    })
    documents.put(document)

    const provider = {
      id: createNodeId("feature", "ssg"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents")],
      hooks: {},
    }
    const runner = new LifecycleRunner(
      [createSearchFeature(options, new NodeSearchDocumentAnalyzer()), provider],
      {
        graph,
        diagnostics,
        documents,
        artifacts,
        emitter: new MemoryEmitter(),
      },
    )

    const result = await runner.run({
      phases: ["analyze", "generate", "compose"],
    })
    const record = await artifacts.get(createSearchDataArtifactId("search"))
    if (!record) throw new Error("Search artifact was not generated.")
    const data = JSON.parse(String(record.content))

    expect(result.ok).toBe(true)
    expect(data.words).toEqual(
      expect.arrayContaining(["Fixture", "Hello", "Search", "content"]),
    )
    expect(data.pages).toMatchObject([
      { url: "/", toc: [[0, "intro"]] },
    ])
    expect(data.pages[0].content).not.toContain(data.words.indexOf("Hidden"))
    expect(document.serialize()).toContain('data-search-relative="0"')
    expect(graph.snapshot().artifacts.get(record.id)).toMatchObject({
      kind: "data",
      owner: SEARCH_FEATURE_ID,
    })
  })
})
