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
  SVG_FEATURE_ID,
  composeSvgDocument,
  createSvgFeature,
} from "../../../src/features/svg/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

function createDocument() {
  return new NodeHtmlDocumentFactory().parse({
    pageId: createNodeId("page", "route:index", "/"),
    html:
      '<main><svg data-minista-svg="" data-minista-svg-src="/icon.svg" viewBox="1 2 3 4"><title>Icon</title></svg></main>',
  })
}

describe("svg feature", () => {
  test("composes a resolved source while preserving an explicit viewBox", async () => {
    const document = createDocument()
    const sources = {
      resolve: vi.fn(async () => ({
        innerHtml: '<path d="M0 0h2v2H0z"></path>',
        viewBox: "0 0 2 2",
      })),
    }

    await expect(composeSvgDocument(document, sources)).resolves.toBe(1)

    expect(sources.resolve).toHaveBeenCalledWith("/icon.svg")
    expect(document.serialize()).toBe(
      '<main><svg viewBox="1 2 3 4"><title>Icon</title><path d="M0 0h2v2H0z"></path></svg></main>',
    )
    expect(document.markers(SVG_FEATURE_ID)[0]).toMatchObject({
      nodeId: document.pageId,
    })
  })

  test("leaves an unresolved marker unchanged", async () => {
    const document = createDocument()

    await expect(
      composeSvgDocument(document, { resolve: async () => undefined }),
    ).resolves.toBe(0)
    expect(document.serialize()).toContain("data-minista-svg")
    expect(document.markers(SVG_FEATURE_ID)).toHaveLength(0)
  })

  test("runs through the explicit compose phase", async () => {
    const diagnostics = new DiagnosticCollector()
    const documents = new MemoryHtmlDocumentStore()
    const document = createDocument()
    documents.put(document)
    const provider = {
      id: createNodeId("feature", "ssg"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents")],
      hooks: {},
    }
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "svg-fixture"),
        name: "svg-fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    )
    const runner = new LifecycleRunner(
      [
        createSvgFeature(
          {},
          {
            resolve: async () => ({
              innerHtml: "<circle></circle>",
              viewBox: "0 0 8 8",
            }),
          },
        ),
        provider,
      ],
      {
        graph,
        diagnostics,
        documents,
        artifacts: new MemoryArtifactStore(),
        emitter: new MemoryEmitter(),
      },
    )

    const result = await runner.run({ phases: ["compose"] })

    expect(result.ok).toBe(true)
    expect(document.serialize()).toContain("<circle></circle>")
  })
})
