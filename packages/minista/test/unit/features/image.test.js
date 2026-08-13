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
  IMAGE_FEATURE_ID,
  createImageFeature,
  createImageOutputsArtifactId,
  createImagePlansArtifactId,
} from "../../../src/features/image/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("image feature", () => {
  test("analyzes markers, generates image artifacts, and composes URLs", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const routeId = createNodeId("route", "src/pages/index.jsx")
    const pageId = createNodeId("page", routeId, "/")
    const generatedId = createNodeId("artifact", "image/photo-640.webp")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "image-fixture"),
        name: "image-fixture",
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
      id: IMAGE_FEATURE_ID,
      apiVersion: 1,
      provides: ["image-assets"],
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
        '<html><body><img data-minista-image="" data-minista-image-src="/images/photo.png" data-minista-image-optimize="{}" alt="Photo"></body></html>',
    })
    documents.put(document)
    const generator = {
      generate: vi.fn(async (references) => ({
        artifacts: [
          {
            id: generatedId,
            source: references[0].source,
            fileName: "photo-640.webp",
            mediaType: "image/webp",
            content: new Uint8Array([1, 2, 3]),
          },
        ],
        plans: [
          {
            key: references[0].key,
            src: generatedId,
            srcset: [{ descriptor: "640w", artifactId: generatedId }],
            sizes: "100vw",
            width: 640,
            height: 360,
          },
        ],
      })),
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
        createImageFeature(
          {
            useCache: false,
            optimize: {},
            decoding: "async",
            loading: "eager",
          },
          generator,
          { resolve: () => "/assets/photo-640.webp" },
        ),
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

    expect(result.ok).toBe(true)
    expect(generator.generate).toHaveBeenCalledOnce()
    expect(await artifacts.get(generatedId)).toMatchObject({
      mediaType: "image/webp",
    })
    expect(await artifacts.get(createImagePlansArtifactId())).toBeDefined()
    expect(JSON.parse(String(
      (await artifacts.get(createImageOutputsArtifactId()))?.content,
    ))).toEqual([{
      id: generatedId,
      source: "/images/photo.png",
      fileName: "photo-640.webp",
      mediaType: "image/webp",
    }])
    expect(document.serialize()).toContain('src="/assets/photo-640.webp"')
    expect(document.serialize()).toContain(
      'srcset="/assets/photo-640.webp 640w" sizes="100vw" width="640" height="360"',
    )
    expect(graph.snapshot().images.get(createNodeId("image", "/images/photo.png")))
      .toMatchObject({ pages: [pageId] })
    expect(graph.snapshot().artifacts.get(generatedId)).toMatchObject({
      kind: "image",
      owner: IMAGE_FEATURE_ID,
    })
  })
})
