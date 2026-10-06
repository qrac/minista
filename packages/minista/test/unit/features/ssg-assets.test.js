import { describe, expect, test } from "vitest"

import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import { createNodeId } from "../../../src/core/index.js"
import {
  collectSsgAssetOutputReferences,
  composeSsgAssetDocument,
} from "../../../src/features/ssg/index.js"

describe("SSG assets", () => {
  test("records output references and composes CSS and relative image URLs", () => {
    const document = new NodeHtmlDocumentFactory().parse({
      pageId: createNodeId("page", "index"),
      html: '<html><head><link rel="preload" as="image" href="/assets/photo.png"></head><body><img src="/assets/photo.png"><source srcset="/assets/photo.png 1x"></body></html>',
    })
    const plan = {
      cssFiles: ["assets/bundle.css"],
      imageFiles: ["assets/photo.png", "assets/unused.png"],
      rewriteRootImages: true,
    }

    expect(collectSsgAssetOutputReferences(document, plan)).toEqual([
      "assets/bundle.css",
      "assets/photo.png",
    ])
    expect(composeSsgAssetDocument(document, plan, {
      resolve: (fileName) => `../${fileName}`,
    })).toBe(4)

    const html = document.serialize()
    expect(html).toContain(
      '<link rel="stylesheet" href="../assets/bundle.css">',
    )
    expect(html).toContain('src="../assets/photo.png"')
    expect(html).toContain('srcset="../assets/photo.png 1x"')
    expect(html).toContain('href="../assets/photo.png"')
  })
})
