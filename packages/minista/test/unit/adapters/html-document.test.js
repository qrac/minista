import { describe, expect, test } from "vitest"

import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import { createNodeId } from "../../../src/core/graph/index.js"

describe("NodeHtmlDocument", () => {
  test("binds graph references to markers and serializes mutations", () => {
    const factory = new NodeHtmlDocumentFactory()
    const document = factory.parse({
      pageId: createNodeId("page", "route:index", "/"),
      html: '<!doctype html><html><body><div data-minista-comment="">note</div></body></html>',
    })
    const [marker] = document.select("[data-minista-comment]")

    expect(marker).toBeDefined()
    if (!marker) return

    document.bind(marker, {
      featureId: createNodeId("feature", "comment"),
      nodeId: "artifact:comment-1",
    })
    marker.replaceWith(`<!-- ${marker.text} -->`)

    expect(document.markers()).toHaveLength(1)
    expect(document.markers(createNodeId("feature", "comment"))[0]).toMatchObject({
      nodeId: "artifact:comment-1",
    })
    expect(document.serialize()).toBe(
      "<!doctype html><html><body><!-- note --></body></html>",
    )
  })

  test("rejects elements from another document", () => {
    const factory = new NodeHtmlDocumentFactory()
    const first = factory.parse({
      pageId: createNodeId("page", "route:first", "/first"),
      html: "<main></main>",
    })
    const second = factory.parse({
      pageId: createNodeId("page", "route:second", "/second"),
      html: "<main></main>",
    })
    const [foreign] = first.select("main")

    expect(() =>
      second.bind(foreign, {
        featureId: createNodeId("feature", "comment"),
        nodeId: "artifact:comment-1",
      }),
    ).toThrow("belongs to another document")
  })
})
