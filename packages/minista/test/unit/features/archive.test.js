import { describe, expect, test, vi } from "vitest"

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
import { createArchiveFeature } from "../../../src/features/archive/index.js"
import { createBeautifyFeature } from "../../../src/features/beautify/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("archive feature", () => {
  test("archives output after an optional beautify feature", async () => {
    const diagnostics = new DiagnosticCollector()
    const emitter = new MemoryEmitter()
    const outputFeature = {
      id: createNodeId("feature", "output"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents"), capability("output-files")],
      hooks: {
        async emit() {
          await emitter.emit({
            fileName: "index.html",
            content: "<html><body><h1>Hello</h1></body></html>",
          })
        },
      },
    }
    const builder = {
      build: vi.fn(async () => {
        const html = (await emitter.list()).find(
          ({ fileName }) => fileName === "index.html",
        )
        expect(html?.content).toContain("\n<body>")
        return new Uint8Array([80, 75])
      }),
    }
    const beautify = createBeautifyFeature({
      src: ["**/*.html"],
      htmlOptions: { indent_size: 2, extra_liners: [] },
      cssOptions: { indent_size: 2 },
      jsOptions: { indent_size: 2 },
      removeImagePreload: false,
    })
    const archive = createArchiveFeature(
      { archives: [{ srcDir: "dist", outName: "site" }] },
      builder,
    )
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "archive-fixture"),
        name: "archive-fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    )
    const runner = new LifecycleRunner(
      [archive, beautify, outputFeature],
      {
        graph,
        diagnostics,
        documents: new MemoryHtmlDocumentStore(),
        artifacts: new MemoryArtifactStore(),
        emitter,
      },
    )

    const result = await runner.run({ phases: ["emit", "finalize"] })

    expect(result.ok).toBe(true)
    expect(builder.build).toHaveBeenCalledOnce()
    expect(await emitter.list()).toContainEqual({
      fileName: "site.zip",
      content: new Uint8Array([80, 75]),
      mediaType: "application/zip",
    })
  })
})
