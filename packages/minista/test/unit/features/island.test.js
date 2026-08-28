import { describe, expect, test, vi } from "vitest"
import { parseAst } from "rolldown/parseAst"

import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import { RolldownIslandSourceTransformer } from "../../../src/adapters/island/index.js"
import { decodeSnippet } from "../../../src/plugins/island/utils/snippet.js"
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
  test("transforms client directives through the Rolldown adapter", () => {
    const transformed = new RolldownIslandSourceTransformer(
      (code, parserOptions) => parseAst(code, parserOptions),
    ).transform(
      'import { Counter } from "./counter.jsx"\nexport default () => <Counter initial={2} client:load />',
      "/project/src/page.jsx",
      options,
    )

    expect(transformed.snippets).toHaveLength(1)
    expect(transformed.code).toContain('data-island-client-directive="load"')
    expect(transformed.code).toContain("data-island-client-snippet=")
    expect(transformed.map).toBeTruthy()
  })

  test("preserves source text and extracts client-only fallback", () => {
    const source = `
import Wrapper from "./wrapper.jsx"
import { Counter as Count } from "./counter.jsx"

export default () => (
  <Wrapper client:only={{ timeout: 10 }}>
    <Count slot="fallback">Loading...</Count>
    {/* keep this comment */}
    <Count initial={2} />
  </Wrapper>
)
`
    const transformed = new RolldownIslandSourceTransformer(
      (code, parserOptions) => parseAst(code, parserOptions),
    ).transform(source, "/project/src/page.jsx", options)

    expect(() => parseAst(transformed.code, { lang: "tsx" })).not.toThrow()
    expect(transformed.code).toContain("<Count slot=\"fallback\">Loading...</Count>")
    expect(transformed.code).not.toContain("<Wrapper client:only")
    expect(transformed.code).toContain(
      'data-island-client-directive-params={"{\\\"timeout\\\":10}"}',
    )
    const snippet = decodeSnippet(transformed.snippets[0])
    expect(snippet).toContain('import Wrapper from "/project/src/wrapper.jsx"')
    expect(snippet).toContain(
      'import { Counter as Count } from "/project/src/counter.jsx"',
    )
    expect(snippet).toContain("{/* keep this comment */}")
    expect(snippet).not.toContain("Loading...")
    expect(snippet).not.toContain("client:only")
  })

  test("transforms directives nested in JSX expressions", () => {
    const source = `
import { Counter } from "./counter.jsx"
export default ({ show }) => (
  <main>
    <Counter client:load />
    {show && <Counter client:visible />}
  </main>
)
`
    const transformed = new RolldownIslandSourceTransformer(
      (code, parserOptions) => parseAst(code, parserOptions),
    ).transform(source, "/project/src/page.jsx", options)

    expect(transformed.snippets).toHaveLength(2)
    expect(transformed.code.match(/data-island-client-directive=/g)).toHaveLength(2)
    expect(transformed.code).not.toContain("client:load")
    expect(transformed.code).not.toContain("client:visible")
    expect(() => parseAst(transformed.code, { lang: "tsx" })).not.toThrow()
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
