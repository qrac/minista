import { describe, expect, test } from "vitest"

import {
  composeViteHtml,
  createViteCompatibilityTraceHooks,
  processViteDocuments,
  processViteOutputs,
  ViteCompatibilityLifecycleError,
} from "../../../src/adapters/vite/compatibility-lifecycle.js"
import { createViteBuildSession } from "../../../src/adapters/vite/build-session.js"
import { createNodeId } from "../../../src/core/graph/index.js"
import { createBeautifyFeature } from "../../../src/features/beautify/index.js"
import { createCommentFeature } from "../../../src/features/comment/index.js"
import {
  createImageFeature,
  createImageOutputsArtifactId,
} from "../../../src/features/image/index.js"
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
  test("shares documents and feature artifacts across build-session runs", async () => {
    const session = createViteBuildSession({ buildId: "store-fixture" })
    const producerId = createNodeId("feature", "producer")
    const consumerId = createNodeId("feature", "consumer")
    const artifactId = createNodeId("artifact", "producer", "fixture")
    let producedDocument
    let consumedDocument
    /** @type {import("../../../src/core/graph/index.js").ProjectGraph | undefined} */
    let producedGraph
    /** @type {import("../../../src/core/graph/index.js").ProjectGraph | undefined} */
    let consumedGraph
    /** @type {import("../../../src/core/lifecycle/index.js").MinistaFeature} */
    const producer = Object.freeze({
      id: producerId,
      apiVersion: /** @type {const} */ (1),
      options: Object.freeze({}),
      hooks: Object.freeze({
        async generate(
          /** @type {import("../../../src/core/lifecycle/index.js").PhaseContext} */
          { artifacts, graph },
        ) {
          producedGraph = graph
          await artifacts.put({
            schemaVersion: "1",
            id: artifactId,
            owner: producerId,
            mediaType: "text/plain",
            content: "fixture",
          })
          graph.addArtifact({
            id: artifactId,
            kind: "data",
            owner: producerId,
            source: "fixture",
            dependencies: [],
          })
        },
        compose(
          /** @type {import("../../../src/core/lifecycle/index.js").PhaseContext} */
          { documents },
        ) {
          producedDocument = documents.list()[0]
        },
      }),
    })
    /** @type {import("../../../src/core/lifecycle/index.js").MinistaFeature} */
    const consumer = Object.freeze({
      id: consumerId,
      apiVersion: /** @type {const} */ (1),
      options: Object.freeze({}),
      hooks: Object.freeze({
        async compose(
          /** @type {import("../../../src/core/lifecycle/index.js").PhaseContext} */
          { artifacts, documents, graph },
        ) {
          consumedGraph = graph
          consumedDocument = documents.list()[0]
          expect(await artifacts.get(artifactId)).toMatchObject({
            content: "fixture",
          })
        },
      }),
    })
    const page = [{
      fileName: "index.html",
      url: "/",
      html: "<main>Fixture</main>",
    }]

    await processViteDocuments(
      page,
      [producer],
      ["generate", "compose"],
      createViteCompatibilityTraceHooks(session, "producer"),
    )
    await processViteDocuments(
      page,
      [consumer],
      ["compose"],
      createViteCompatibilityTraceHooks(session, "consumer"),
    )

    expect(consumedDocument).toBe(producedDocument)
    expect(consumedGraph).toBe(producedGraph)
    expect(session.state.compatibilityDocuments?.list()).toHaveLength(1)
    const graph = session.state.compatibilityGraph?.snapshot()
    expect(graph?.features.has(producerId)).toBe(true)
    expect(graph?.features.has(consumerId)).toBe(true)
    expect(graph?.artifacts.get(artifactId))
      .toMatchObject({ owner: producerId })
    expect(graph?.pages.size).toBe(1)
  })

  test("replaces input-page artifacts without dropping other dev pages", async () => {
    const session = createViteBuildSession({ buildId: "dev-pages" })
    const feature = createSpriteFeature({}, {
      async build(sourceDirectory) {
        return `<svg data-source="${sourceDirectory}"></svg>`
      },
    }, {
      resolve(artifactId) {
        return `/assets/${artifactId}.svg`
      },
    })
    /** @param {string} fileName @param {string} url @param {string} html */
    const run = (fileName, url, html) => processViteDocuments(
      [{ fileName, url, html }],
      [feature],
      undefined,
      createViteCompatibilityTraceHooks(session, `sprite:dev:${url}`, {
        artifactUpdate: "input-pages",
      }),
    )

    await run(
      "first.html",
      "/first/",
      '<svg data-minista-sprite data-minista-sprite-src="icons/first.svg"></svg>',
    )
    await run(
      "second.html",
      "/second/",
      '<svg data-minista-sprite data-minista-sprite-src="logos/second.svg"></svg>',
    )

    const beforeRemoval = await session.artifacts.list()
    expect(beforeRemoval.filter(({ mediaType }) =>
      mediaType === "application/vnd.minista.sprite-references+json"
    )).toHaveLength(2)
    expect(beforeRemoval.some(({ id }) =>
      id === createSpriteArtifactId("icons")
    )).toBe(true)
    expect(beforeRemoval.some(({ id }) =>
      id === createSpriteArtifactId("logos")
    )).toBe(true)

    await run("first.html", "/first/", "<main>No sprite</main>")

    const afterRemoval = await session.artifacts.list()
    expect(afterRemoval.filter(({ mediaType }) =>
      mediaType === "application/vnd.minista.sprite-references+json"
    )).toHaveLength(1)
    expect(afterRemoval.some(({ id }) =>
      id === createSpriteArtifactId("icons")
    )).toBe(false)
    expect(afterRemoval.some(({ id }) =>
      id === createSpriteArtifactId("logos")
    )).toBe(true)
    const graph = session.state.compatibilityGraph?.snapshot()
    expect([...graph?.artifacts.values() ?? []].filter(({ scope }) =>
      scope?.kind === "page"
    )).toHaveLength(1)
  })

  test("regenerates image aggregates from retained dev page references", async () => {
    const session = createViteBuildSession({ buildId: "dev-images" })
    /** @type {import("../../../src/features/image/index.js").ImageGenerator} */
    const generator = {
      async generate(references) {
        return {
          artifacts: references.map((reference) => {
            const name = reference.source.split("/").pop() ?? "image"
            return {
              id: createNodeId("artifact", "image", name),
              source: reference.source,
              fileName: `${name}.webp`,
              mediaType: "image/webp",
              content: new Uint8Array([name.length]),
            }
          }),
          plans: references.map((reference) => {
            const name = reference.source.split("/").pop() ?? "image"
            const artifactId = createNodeId("artifact", "image", name)
            return {
              key: reference.key,
              src: artifactId,
              srcset: [{ descriptor: "1x", artifactId }],
              sizes: "100vw",
              width: 1,
              height: 1,
            }
          }),
        }
      },
    }
    const feature = createImageFeature({
      useCache: false,
      optimize: {},
      decoding: "async",
      loading: "eager",
    }, generator, {
      resolve(artifactId) {
        return `/assets/${artifactId}.webp`
      },
    })
    /** @param {string} fileName @param {string} url @param {string} html */
    const run = (fileName, url, html) => processViteDocuments(
      [{ fileName, url, html }],
      [feature],
      undefined,
      createViteCompatibilityTraceHooks(session, `image:dev:${url}`, {
        artifactUpdate: "input-pages",
      }),
    )

    await run(
      "first.html",
      "/first/",
      '<img data-minista-image data-minista-image-src="/first.png">',
    )
    await run(
      "second.html",
      "/second/",
      '<img data-minista-image data-minista-image-src="/second.png">',
    )

    /** @returns {Promise<import("../../../src/features/image/index.js").GeneratedImageOutput[]>} */
    const readOutputs = async () => JSON.parse(String(
      (await session.artifacts.get(createImageOutputsArtifactId()))?.content,
    ))
    expect((await readOutputs()).map(({ source }) => source).sort()).toEqual([
      "/first.png",
      "/second.png",
    ])

    await run("first.html", "/first/", "<main>No image</main>")

    expect((await readOutputs()).map(({ source }) => source)).toEqual([
      "/second.png",
    ])
  })

  test("accumulates finalized outputs in the build-session emitter", async () => {
    const session = createViteBuildSession({ buildId: "emitter-fixture" })
    /** @type {import("../../../src/core/artifacts/index.js").Emitter[]} */
    const emitters = []
    /** @param {string} name @param {string} fileName */
    const feature = (name, fileName) => /** @type {import("../../../src/core/lifecycle/index.js").MinistaFeature} */ ({
      id: createNodeId("feature", name),
      apiVersion: 1,
      options: Object.freeze({}),
      hooks: Object.freeze({
        async finalize(
          /** @type {import("../../../src/core/lifecycle/index.js").PhaseContext} */
          { emitter },
        ) {
          emitters.push(emitter)
          await emitter.emit({ fileName, content: name })
        },
      }),
    })

    await processViteOutputs(
      [],
      [feature("first-output", "first.txt")],
      createViteCompatibilityTraceHooks(session, "first-output"),
    )
    const second = await processViteOutputs(
      [],
      [feature("second-output", "second.txt")],
      createViteCompatibilityTraceHooks(session, "second-output"),
    )

    expect(second.map(({ fileName }) => fileName)).toEqual(["second.txt"])
    expect((await session.state.compatibilityEmitter?.list())
      ?.map(({ fileName }) => fileName)).toEqual(["first.txt", "second.txt"])
    expect(emitters[1]).toBe(emitters[0])
  })

  test("merges consumers when features contribute the same session asset", async () => {
    const session = createViteBuildSession({ buildId: "graph-fixture" })
    const assetId = createNodeId("asset", "shared.css")
    /** @param {string} name */
    const feature = (name) => /** @type {import("../../../src/core/lifecycle/index.js").MinistaFeature} */ ({
      id: createNodeId("feature", name),
      apiVersion: 1,
      options: Object.freeze({}),
      hooks: Object.freeze({
        generate(
          /** @type {import("../../../src/core/lifecycle/index.js").PhaseContext} */
          { documents, graph },
        ) {
          graph.addAsset({
            id: assetId,
            kind: "source",
            consumers: documents.list().map(({ pageId }) => pageId),
          })
        },
      }),
    })
    /** @param {string} name @param {string} fileName @param {string} url */
    const run = (name, fileName, url) => processViteDocuments(
      [{ fileName, url, html: `<main>${name}</main>` }],
      [feature(name)],
      ["generate"],
      createViteCompatibilityTraceHooks(session, name),
    )

    await run("first-asset", "first.html", "/first/")
    await run("second-asset", "second.html", "/second/")

    expect(session.state.compatibilityGraph?.snapshot().assets.get(assetId)
      ?.consumers)
      .toHaveLength(2)
  })

  test("accumulates phase traces across compatibility runs in a build session", async () => {
    const session = createViteBuildSession({ buildId: "trace-fixture" })
    /** @type {string[]} */
    const observed = []
    const page = [{
      fileName: "index.html",
      url: "/",
      html: '<main><span data-minista-comment="">fixture</span></main>',
    }]

    await processViteDocuments(
      page,
      [createCommentFeature()],
      ["compose"],
      createViteCompatibilityTraceHooks(session, "comment:first", {
        onTrace(event) {
          observed.push(event.type)
        },
      }),
    )
    await processViteDocuments(
      page,
      [createCommentFeature()],
      ["compose"],
      createViteCompatibilityTraceHooks(session, "comment:second"),
    )

    expect(observed).toEqual([
      "phase:start",
      "feature:start",
      "feature:end",
      "phase:end",
    ])
    expect(session.state.compatibilityTraces).toHaveLength(8)
    expect(session.state.compatibilityTraces?.map(({ scope }) => scope))
      .toEqual([
        "comment:first",
        "comment:first",
        "comment:first",
        "comment:first",
        "comment:second",
        "comment:second",
        "comment:second",
        "comment:second",
      ])
  })

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
