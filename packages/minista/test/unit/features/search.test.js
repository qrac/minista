import { describe, expect, test, vi } from "vitest"
import { processViteDocuments } from "../../../src/adapters/vite/compatibility-lifecycle.js"
import { createViteBuildSession } from "../../../src/adapters/vite/build-session.js"

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
        '<html><head><title>Fixture | Site</title></head><body><main data-search><h1 id="intro">Hello World</h1><pre><code>const hiddenCode = &quot;raw&quot;</code></pre><p>Search content</p><p data-search-ignore>Hidden</p><input data-search-input></main></body></html>',
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
    expect(data.words).not.toContain("hiddenCode")
    expect(data.words).not.toContain("raw")
    expect(data.words).not.toContain("code")
    expect(document.serialize()).toContain('data-search-relative="0"')
    expect(graph.snapshot().artifacts.get(record.id)).toMatchObject({
      kind: "data",
      owner: SEARCH_FEATURE_ID,
    })
  })
})

test("excludes every matching subtree from vocabulary, content and toc without mutating HTML", async () => {
  const html = '<title>Fixture | Site</title><main data-search><h1 id="intro">Visible</h1><div class="skip">Firsthidden</div><div class="skip"><h2 id="hidden">Secondhidden</h2><div class="skip">Nestedhidden</div></div><section><p class="skip">Thirdhidden</p><h2 id="after">Remaining</h2><p>Body <b>inline</b> tail</p></section><pre id="code">Codehidden</pre><script>Scripthidden</script><style>Stylehidden</style></main>'
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "exclusions"), html,
  })
  const before = document.serialize()
  const analysis = await new NodeSearchDocumentAnalyzer().analyze(document, {
    ...options, ignoreSelectors: ["main > .skip", "section .skip"],
  })
  expect(analysis.title).toEqual(["Fixture"])
  expect(analysis.content).toEqual(["Visible", "Remaining", "Body", "inline", "tail"])
  expect(analysis.words).toEqual(["Fixture", ...analysis.content])
  expect(analysis.toc).toEqual([[0, "intro"], [1, "after"]])
  expect(document.serialize()).toBe(before)
})

test("can exclude the target element itself", async () => {
  const document = new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "excluded-target"),
    html: '<title>Fixture</title><main data-search class="skip" id="hidden"><h1>Hidden</h1></main>',
  })
  expect(await new NodeSearchDocumentAnalyzer().analyze(document, {
    ...options, ignoreSelectors: [".skip"],
  })).toEqual({ words: ["Fixture"], title: ["Fixture"], content: [], toc: [] })
})

test("shares page analysis across overlapping indexes and replaces scoped artifacts on a new snapshot", async () => {
  const analyzer = new NodeSearchDocumentAnalyzer()
  const analyze = vi.spyOn(analyzer, 'analyze')
  const feature = createSearchFeature({ indexes: [
    { ...options, name: 'en', outName: 'search-en', ignore: ['ja/**'] },
    { ...options, name: 'ja', outName: 'search-ja', src: ['ja/**/*.html'] },
    { ...options, name: 'all', outName: 'search-all', hit: { ...options.hit, english: false } },
    { ...options, name: 'alternate', outName: 'search-alternate', src: ['index.html'], targetSelector: 'aside' },
  ] }, analyzer)
  const session = createViteBuildSession()
  const pages = [
    { fileName: '/', url: '/', html: '<title>English | Site</title><main data-search>Visible</main><aside>Alternate</aside>' },
    { fileName: '/ja/', url: '/ja/', html: '<title>日本語 | Site</title><main data-search>Japanese</main>' },
  ]
  const result = await processViteDocuments(pages, [feature], undefined, { session })
  expect(analyze).toHaveBeenCalledTimes(3)
  const analysisArtifacts = result.artifacts.filter((record) => record.scope?.kind === 'page')
  expect(analysisArtifacts).toHaveLength(3)
  /** @param {string} name */
  const data = (name) => JSON.parse(String(result.artifacts.find((record) => record.id === createSearchDataArtifactId(`search-${name}`))?.content))
  expect(data('en').pages.map((/** @type {any} */ page) => page.url)).toEqual(['/'])
  expect(data('ja').pages.map((/** @type {any} */ page) => page.url)).toEqual(['/ja/'])
  expect(data('alternate').words).toContain('Alternate')
  expect(data('alternate').words).not.toContain('Visible')
  expect(data('all').words).toContain('Visible')
  expect(data('all').hits).not.toContain(data('all').words.indexOf('Visible'))
  const dependencies = ['en', 'ja', 'all', 'alternate'].map((name) => result.graph.artifacts.get(createSearchDataArtifactId(`search-${name}`))?.dependencies ?? [])
  expect(dependencies.map((ids) => ids.length)).toEqual([1, 1, 2, 1])
  expect(new Set(dependencies[2])).toEqual(new Set([...dependencies[0], ...dependencies[1]]))
  expect(dependencies[3]).not.toEqual(dependencies[0])

  // Removed pages must not leak from the server's shared Document Store.
  const updated = await processViteDocuments([pages[0]], [feature], undefined, { session })
  const ja = updated.artifacts.find((record) => record.id === createSearchDataArtifactId('search-ja'))
  expect(JSON.parse(String(ja?.content)).pages).toEqual([])
  expect(updated.graph.artifacts.get(createSearchDataArtifactId('search-ja'))?.dependencies).toEqual([])
  expect(updated.artifacts.filter((record) => record.scope?.kind === 'page')).toHaveLength(2)
  expect(updated.graph.artifacts.size).toBe(updated.artifacts.length)
})
