import { describe, expect, test } from "vitest"

import {
  NodeHtmlDocumentError,
  NodeHtmlDocumentFactory,
} from "../../../src/adapters/html/index.js"
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

  test("normalizes parser failures without including page HTML", () => {
    const pageId = createNodeId("page", "route:invalid", "/invalid")

    expect(() => new NodeHtmlDocumentFactory().parse({
      pageId,
      html: /** @type {any} */ (null),
    })).toThrow(NodeHtmlDocumentError)
    try {
      new NodeHtmlDocumentFactory().parse({
        pageId,
        html: /** @type {any} */ (null),
      })
    } catch (error) {
      expect(error).toMatchObject({
        code: "MINISTA_HTML_PARSE_FAILED",
        operation: "parse",
        diagnostic: {
          severity: "error",
          nodeId: pageId,
        },
      })
      expect(String(error)).not.toContain("<html")
    }
  })

  test("normalizes selector parser failures", () => {
    const pageId = createNodeId("page", "route:invalid-query", "/query")
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: "<main></main>",
    })

    expect(() => document.select("[")).toThrowError(expect.objectContaining({
      code: "MINISTA_HTML_QUERY_FAILED",
      operation: "query",
      diagnostic: expect.objectContaining({ nodeId: pageId }),
    }))
  })

  test("normalizes fragment parser failures during mutations", () => {
    const pageId = createNodeId("page", "route:invalid-mutation", "/mutation")
    const document = new NodeHtmlDocumentFactory().parse({
      pageId,
      html: "<main></main>",
    })
    const [main] = document.select("main")

    expect(() => main?.appendHtml(/** @type {any} */ (null)))
      .toThrowError(expect.objectContaining({
        code: "MINISTA_HTML_MUTATION_FAILED",
        operation: "mutate",
        diagnostic: expect.objectContaining({ nodeId: pageId }),
      }))
  })
})
