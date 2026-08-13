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
  BUNDLE_FEATURE_ID,
  collectBundleOutputReferences,
  createBundleFeature,
} from "../../../src/features/bundle/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("bundle feature", () => {
  test("creates a bundle plan and composes CSS and relative image URLs", async () => {
    const diagnostics = new DiagnosticCollector()
    const artifacts = new MemoryArtifactStore()
    const documents = new MemoryHtmlDocumentStore()
    const pageId = createNodeId("page", "index")
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "bundle-fixture"),
        name: "bundle-fixture",
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
      id: BUNDLE_FEATURE_ID,
      apiVersion: 1,
      provides: ["client-bundle"],
      requires: ["html-documents"],
    })
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: '<html><head><link rel="preload" as="image" href="/assets/photo.png"></head><body><img src="/assets/photo.png"><source srcset="/assets/photo.png 1x"></body></html>',
    })
    expect(collectBundleOutputReferences(document, {
      cssFiles: ["assets/bundle.css"],
      imageFiles: ["assets/photo.png", "assets/unused.png"],
      rewriteRootImages: true,
    })).toEqual(["assets/bundle.css", "assets/photo.png"])
    documents.put(document)
    const builder = {
      bundle: vi.fn(async () => ({
        cssFiles: ["assets/bundle.css"],
        imageFiles: ["assets/photo.png"],
        rewriteRootImages: true,
      })),
    }
    const provider = {
      id: createNodeId("feature", "ssg"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents")],
      hooks: {},
    }
    const options = {
      src: ["/src/pages/**/*.jsx"],
      outName: "bundle",
      useExportCss: true,
    }
    const runner = new LifecycleRunner(
      [
        createBundleFeature(options, builder, {
          resolve: (fileName) => `../${fileName}`,
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

    expect(result.ok).toBe(true)
    expect(builder.bundle).toHaveBeenCalledWith(options)
    expect(html).toContain(
      '<link rel="stylesheet" href="../assets/bundle.css">',
    )
    expect(html).toContain('src="../assets/photo.png"')
    expect(html).toContain('srcset="../assets/photo.png 1x"')
    expect(html).toContain('href="../assets/photo.png"')
    expect(graph.snapshot().artifacts.get(
      createNodeId("artifact", "client-bundle-plan"),
    )).toMatchObject({ owner: BUNDLE_FEATURE_ID })
  })
})
