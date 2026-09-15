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
    expect(transformed.code).toContain('directive="load"')
    expect(transformed.code).toContain("snippet=")
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
    expect(transformed.code).toContain('parameters={{ timeout: 10 }}')
    const snippet = decodeSnippet(transformed.snippets[0])
    expect(snippet).toContain('import IslandComponent0 from "/project/src/wrapper.jsx"')
    expect(snippet).toContain('import { Counter as IslandComponent1 } from "/project/src/counter.jsx"')
    expect(snippet).toContain('export default IslandComponent0')
    expect(snippet).not.toContain('initial')
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
    expect(transformed.code.match(/ directive=/g)).toHaveLength(2)
    expect(transformed.code).not.toContain("client:load")
    expect(transformed.code).not.toContain("client:visible")
    expect(() => parseAst(transformed.code, { lang: "tsx" })).not.toThrow()
  })

  test("component entries are independent of values, directives and local import aliases", () => {
    const transformer = new RolldownIslandSourceTransformer(parseAst)
    const first = transformer.transform('import Counter from "./counter"; export default ({ value }) => <Counter client:load {...value} />', "/project/page.jsx", options)
    const second = transformer.transform('import Count from "./counter"; export default ({ other }) => <Count client:idle={other.timing} count={other.count} />', "/project/page.jsx", options)
    expect(first.snippets).toEqual(second.snippets)
    expect(decodeSnippet(first.snippets[0])).not.toMatch(/value|other|count=|client:/)
    expect(second.code).toContain("parameters={other.timing}")
  })

  test("namespace components and keyed variable children keep expressions in the server module", () => {
    const transformed = new RolldownIslandSourceTransformer(parseAst).transform(
      'import * as UI from "./ui"; export default ({ items }) => <div client:load>{items.map(item => <UI.Counter key={item.id} {...item} />)}</div>',
      "/project/page.jsx", options,
    )
    expect(transformed.code).toContain("items.map")
    expect(decodeSnippet(transformed.snippets[0])).toContain("IslandComponent0.Counter")
    expect(decodeSnippet(transformed.snippets[0])).not.toContain("items")
    expect(() => parseAst(transformed.code, { lang: "tsx" })).not.toThrow()
  })

  test.each([
    ['const Local = () => null; export default () => <Local client:load />', "MINISTA_ISLAND_COMPONENT_UNRESOLVED"],
    ['import Counter from "./counter"; export default ({ Counter }) => <Counter client:load />', "MINISTA_ISLAND_COMPONENT_UNRESOLVED"],
    ['import Counter from "./counter"; export default () => <div client:load>{[1].map(Counter => <Counter />)}</div>', "MINISTA_ISLAND_COMPONENT_UNRESOLVED"],
    ['export default () => <div client:load client:only />', "MINISTA_ISLAND_DIRECTIVE_CONFLICT"],
    ['export default () => <div client:load><span client:idle /></div>', "MINISTA_ISLAND_NESTED"],
  ])("rejects ambiguous component and boundary ownership: %s", (source, code) => {
    expect(() => new RolldownIslandSourceTransformer(parseAst).transform(source, "/project/page.jsx", options))
      .toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code }) }))
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
