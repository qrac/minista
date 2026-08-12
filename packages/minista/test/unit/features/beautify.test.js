import { describe, expect, test } from "vitest"

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
import { createBeautifyFeature } from "../../../src/features/beautify/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

const options = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: { indent_size: 2, extra_liners: [] },
  cssOptions: { indent_size: 2 },
  jsOptions: { indent_size: 2 },
  removeImagePreload: true,
}

describe("beautify feature", () => {
  test("removes image preloads during compose and formats emitted text during finalize", async () => {
    const diagnostics = new DiagnosticCollector()
    const documents = new MemoryHtmlDocumentStore()
    const emitter = new MemoryEmitter()
    const document = new NodeHtmlDocumentFactory().parse({
      pageId: createNodeId("page", "route:index", "/"),
      html:
        '<html><body><link rel="preload" as="image" href="/hero.png"><main><h1>Hello</h1></main></body></html>',
    })
    documents.put(document)

    const outputFeature = {
      id: createNodeId("feature", "output"),
      apiVersion: /** @type {const} */ (1),
      options: {},
      provides: [capability("html-documents"), capability("output-files")],
      hooks: {
        async emit() {
          await emitter.emit({
            fileName: "index.html",
            content: document.serialize(),
          })
          await emitter.emit({
            fileName: "assets/site.css",
            content: "body{color:red}",
          })
          await emitter.emit({
            fileName: "scripts/app.js",
            content: "const value={answer:42};",
          })
          await emitter.emit({
            fileName: "assets/image.png",
            content: new Uint8Array([1, 2, 3]),
          })
        },
      },
    }
    const graph = new ProjectGraph(
      {
        id: createNodeId("project", "beautify-fixture"),
        name: "beautify-fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    )
    const runner = new LifecycleRunner(
      [createBeautifyFeature(options), outputFeature],
      {
        graph,
        diagnostics,
        documents,
        artifacts: new MemoryArtifactStore(),
        emitter,
      },
    )

    const result = await runner.run({
      phases: ["compose", "emit", "finalize"],
    })
    const files = await emitter.list()

    expect(result.ok).toBe(true)
    expect(document.serialize()).not.toContain("rel=\"preload\"")
    expect(files.find(({ fileName }) => fileName === "index.html")?.content)
      .toContain("\n  <main>")
    expect(files.find(({ fileName }) => fileName.endsWith("site.css"))?.content)
      .toContain("color: red")
    expect(files.find(({ fileName }) => fileName.endsWith("app.js"))?.content)
      .toContain("answer: 42")
    expect(files.find(({ fileName }) => fileName.endsWith("image.png"))?.content)
      .toEqual(new Uint8Array([1, 2, 3]))
  })
})
