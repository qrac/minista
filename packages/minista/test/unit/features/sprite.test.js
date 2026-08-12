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
  SPRITE_FEATURE_ID,
  createSpriteArtifactId,
  createSpriteFeature,
} from "../../../src/features/sprite/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("sprite feature", () => {
  test("analyzes references, generates a sprite, and composes its URL", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const routeId = createNodeId("route", "src/pages/index.jsx")
    const pageId = createNodeId("page", routeId, "/")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "sprite-fixture"),
        name: "sprite-fixture",
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
      id: SPRITE_FEATURE_ID,
      apiVersion: 1,
      provides: ["sprite-assets"],
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
        '<html><body><svg><use data-minista-sprite="" data-minista-sprite-src="/icons/home.svg" data-minista-sprite-symbol-id="house"></use></svg></body></html>',
    })
    documents.put(document)
    const builder = {
      build: vi.fn(async () =>
        '<svg><symbol id="house" viewBox="0 0 1 1"></symbol></svg>',
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
        createSpriteFeature({}, builder, {
          resolve: () => "/assets/icons.svg",
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
      phases: ["analyze", "generate", "compose"],
    })
    const artifact = await artifacts.get(createSpriteArtifactId("icons"))
    if (!artifact) throw new Error("Sprite artifact was not generated.")

    expect(result.ok).toBe(true)
    expect(builder.build).toHaveBeenCalledWith("icons")
    expect(artifact.mediaType).toBe("image/svg+xml")
    expect(document.serialize()).toContain(
      '<use href="/assets/icons.svg#house"></use>',
    )
    expect(graph.snapshot().assets.get(createNodeId("asset", "icons/home.svg")))
      .toMatchObject({ consumers: [pageId] })
    expect(graph.snapshot().artifacts.get(artifact.id)).toMatchObject({
      kind: "sprite",
      owner: SPRITE_FEATURE_ID,
    })
  })
})
