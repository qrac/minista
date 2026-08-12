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
import {
  COMMENT_FEATURE_ID,
  createCommentFeature,
} from "../../../src/features/comment/index.js"

/** @typedef {import("../../../src/core/types.js").Capability} Capability */

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

describe("comment feature", () => {
  test("composes every document during the explicit compose phase", async () => {
    const diagnostics = new DiagnosticCollector()
    const documents = new MemoryHtmlDocumentStore()
    const pageId = createNodeId("page", "route:index", "/")
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: '<main><div data-minista-comment="">note</div></main>',
    })
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
        id: createNodeId("project", "comment-fixture"),
        name: "comment-fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    )
    const runner = new LifecycleRunner(
      [createCommentFeature(), provider],
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
    expect(document.serialize()).toBe("<main><!-- note --></main>")
    expect(document.markers(COMMENT_FEATURE_ID)[0]).toMatchObject({
      nodeId: pageId,
    })
  })
})
