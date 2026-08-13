import { describe, expect, test, vi } from "vitest"

import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import { SwcIslandSourceTransformer } from "../../../src/adapters/island/index.js"
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
  ISLAND_FEATURE_ID,
  createIslandBundleArtifactId,
  createIslandFeature,
  createIslandSnippetsArtifactId,
  createIslandSourcePlanArtifactId,
} from "../../../src/features/island/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

const options = {
  useSplitPages: true,
  outName: "island-[index]",
  rootAttrName: "island",
  rootDOMElement: /** @type {const} */ ("div"),
  rootStyle: { display: "contents" },
}

describe("island feature", () => {
  test("transforms client directives through the SWC adapter", () => {
    const transformed = new SwcIslandSourceTransformer().transform(
      'import { Counter } from "./counter.jsx"\nexport default () => <Counter initial={2} client:load />',
      "/project/src/page.jsx",
      options,
    )

    expect(transformed.snippets).toHaveLength(1)
    expect(transformed.code).toContain('data-island-client-directive="load"')
    expect(transformed.code).toContain("data-island-client-snippet=")
  })

  test("analyzes snippets, generates entries, bundles, and composes documents", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const pageId = createNodeId("page", "index")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "island-fixture"),
        name: "island-fixture",
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
      id: ISLAND_FEATURE_ID,
      apiVersion: 1,
      provides: ["island-entries"],
      requires: ["html-documents"],
    })
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: '<html><head></head><body><div data-island-client-directive="load" data-island-client-snippet="encoded-a"><button>Count</button></div><div data-island-client-directive="visible" data-island-client-snippet="encoded-b"><p>Search</p></div></body></html>',
    })
    documents.put(document)
    const generator = {
      createSnippet: vi.fn(async (snippet) => `decoded:${snippet}`),
      createEntry: vi.fn(async (indexes) => `entry:${indexes.join(",")}`),
    }
    await artifacts.put({
      schemaVersion: "1",
      id: createIslandSnippetsArtifactId(),
      owner: ISLAND_FEATURE_ID,
      mediaType: "application/vnd.minista.island-snippets+json",
      content: JSON.stringify(["encoded-b", "encoded-a"]),
    })
    const bundler = {
      bundle: vi.fn(async (plan) =>
        plan.entries.map(
          (/** @type {import("../../../src/features/island/index.js").IslandEntrySource} */ entry) => ({
          patternIndex: entry.patternIndex,
          fileName: `scripts/${entry.fileName}.js`,
          cssFiles: ["assets/island.css"],
          }),
        ),
      ),
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
        createIslandFeature(options, generator, bundler, {
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
      phases: ["analyze", "generate", "bundle", "compose"],
    })
    const html = document.serialize()

    expect(result.ok).toBe(true)
    expect(generator.createSnippet).toHaveBeenCalledTimes(2)
    expect(generator.createSnippet).toHaveBeenNthCalledWith(1, "encoded-b")
    expect(generator.createSnippet).toHaveBeenNthCalledWith(2, "encoded-a")
    expect(generator.createEntry).toHaveBeenCalledWith([1, 2], options)
    expect(bundler.bundle).toHaveBeenCalledOnce()
    expect(await artifacts.get(createIslandSourcePlanArtifactId())).toBeDefined()
    expect(await artifacts.get(createIslandBundleArtifactId())).toBeDefined()
    expect(html).toContain('data-island-client-snippet="1"')
    expect(html).toContain('data-island-client-snippet="2"')
    expect(html).toContain('<link rel="stylesheet" href="/assets/island.css">')
    expect(html).toContain('<script type="module" src="/scripts/island-1.js"></script>')
    expect(graph.snapshot().islands.size).toBe(2)
  })
})
