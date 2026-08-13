import { describe, expect, test } from "vitest"

import {
  composeViteHtml,
  processViteDocuments,
  processViteOutputs,
  ViteCompatibilityLifecycleError,
} from "../../../src/adapters/vite/compatibility-lifecycle.js"
import { createNodeId } from "../../../src/core/graph/index.js"
import { createBeautifyFeature } from "../../../src/features/beautify/index.js"
import { createCommentFeature } from "../../../src/features/comment/index.js"
import {
  createSearchDataArtifactId,
  createSearchFeature,
} from "../../../src/features/search/index.js"
import {
  createSpriteArtifactId,
  createSpriteFeature,
} from "../../../src/features/sprite/index.js"
import { NodeSearchDocumentAnalyzer } from "../../../src/adapters/html/index.js"

describe("Vite compatibility lifecycle", () => {
  test("runs document composition through the Core lifecycle", async () => {
    await expect(composeViteHtml(
      '<main><span data-minista-comment="">fixture</span></main>',
      "index.html",
      [createCommentFeature()],
    )).resolves.toContain("<!-- fixture -->")
  })

  test("moves composed documents into the emitter before finalize", async () => {
    const feature = createBeautifyFeature({
      src: ["**/*.html"],
      htmlOptions: { indent_size: 2 },
      cssOptions: {},
      jsOptions: {},
      removeImagePreload: true,
    })
    const [output] = await processViteOutputs([{
      fileName: "index.html",
      content: "<html><body><link rel=\"preload\" as=\"image\"><main>Fixture</main></body></html>",
    }], [feature])

    expect(String(output.content)).not.toContain('rel="preload"')
    expect(String(output.content)).toContain("\n<body>")
  })

  test("runs batch analyze, generate, and compose phases with Page Graph nodes", async () => {
    const options = {
      outName: "search",
      src: ["**/*.html"],
      ignore: [],
      trimTitle: "",
      targetSelector: "[data-search]",
      ignoreSelectors: [],
      relativeAttr: "data-search-relative",
      inputAttr: "data-search-input",
      hit: {
        minLength: 3,
        number: false,
        english: true,
        hiragana: false,
        katakana: true,
        kanji: true,
      },
    }
    const result = await processViteDocuments([{
      fileName: "guide/index.html",
      url: "/guide/",
      html: "<html><head><title>Guide</title></head><body><main data-search>Search guide<input data-search-input></main></body></html>",
    }], [createSearchFeature(options, new NodeSearchDocumentAnalyzer())])
    const artifact = result.artifacts.find(
      ({ id }) => id === createSearchDataArtifactId("search"),
    )

    expect(JSON.parse(String(artifact?.content))).toMatchObject({
      pages: [{ url: "/guide/" }],
    })
    expect(result.documents[0].html).toContain('data-search-relative="1"')
    expect([...result.graph.pages.values()]).toMatchObject([{
      url: "/guide/",
    }])
  })

  test("resolves generated artifact outputs before composing documents", async () => {
    const outputs = new Map()
    const feature = createSpriteFeature(
      {},
      { build: async () => '<svg><symbol id="home"></symbol></svg>' },
      { resolve: (artifactId) => outputs.get(artifactId) },
    )
    const result = await processViteDocuments([{
      fileName: "guide/index.html",
      url: "/guide/",
      html: '<svg><use data-minista-sprite data-minista-sprite-src="src/icons/home.svg"></use></svg>',
    }], [feature], undefined, {
      beforeCompose({ artifacts }) {
        expect(artifacts).toContainEqual(expect.objectContaining({
          id: createSpriteArtifactId("src/icons"),
          mediaType: "image/svg+xml",
        }))
        outputs.set(createSpriteArtifactId("src/icons"), "assets/icons.svg")
      },
    })

    expect(result.documents[0].html).toContain(
      'href="assets/icons.svg#home"',
    )
    expect(result.documents[0].html).not.toContain("data-minista-sprite")
  })

  test("surfaces lifecycle diagnostics with a stable adapter error", async () => {
    const failure = Object.freeze({
      id: createNodeId("feature", "failure"),
      apiVersion: /** @type {const} */ (1),
      options: Object.freeze({}),
      hooks: Object.freeze({
        compose() {
          throw new Error("compose failed")
        },
      }),
    })

    await expect(composeViteHtml("<main></main>", "index.html", [failure]))
      .rejects.toMatchObject({
        code: "MINISTA_VITE_COMPATIBILITY_LIFECYCLE_FAILED",
        diagnostics: [expect.objectContaining({
          code: "MINISTA_PHASE_FAILED",
          feature: "feature:failure",
          phase: "compose",
        })],
      })
    await expect(composeViteHtml("<main></main>", "index.html", [failure]))
      .rejects.toBeInstanceOf(ViteCompatibilityLifecycleError)
  })
})
