// @ts-check

import { createNodeId, toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/graph/index.js").PageId} PageId */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./sprite.js").SpriteBuilder} SpriteBuilder */
/** @typedef {import("./sprite.js").SpriteFeatureOptions} SpriteFeatureOptions */
/** @typedef {import("./sprite.js").SpriteOutputResolver} SpriteOutputResolver */
/** @typedef {import("./sprite.js").SpriteReference} SpriteReference */

export const SPRITE_FEATURE_ID = createNodeId("feature", "sprite")

/** @param {string} value */
function basename(value) {
  return value.replaceAll("\\", "/").split("/").pop() ?? value
}

/** @param {string} value */
function dirname(value) {
  const parts = value.replaceAll("\\", "/").split("/")
  parts.pop()
  return parts.join("/") || "."
}

/** @param {string} value */
function filenameStem(value) {
  return basename(value).replace(/\.[^.]*$/, "")
}

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {string} sourceDirectory */
export function createSpriteArtifactId(sourceDirectory) {
  return createNodeId(
    "artifact",
    `sprite/${basename(sourceDirectory)}.svg`,
  )
}

/**
 * @param {HtmlDocument} document
 * @returns {readonly SpriteReference[]}
 */
export function collectSpriteReferences(document) {
  return Object.freeze(
    document.select("[data-minista-sprite]").flatMap((element) => {
      const source = element
        .getAttribute("data-minista-sprite-src")
        ?.replace(/^\//, "")
      if (!source) return []
      document.bind(element, {
        featureId: SPRITE_FEATURE_ID,
        nodeId: document.pageId,
      })
      return [
        Object.freeze({
          pageId: document.pageId,
          source,
          sourceDirectory: dirname(source),
          symbolId:
            element.getAttribute("data-minista-sprite-symbol-id") ??
            filenameStem(source),
        }),
      ]
    }),
  )
}

/**
 * @param {HtmlDocument} document
 * @param {SpriteOutputResolver} outputs
 * @returns {number}
 */
export function composeSpriteDocument(document, outputs) {
  let composed = 0
  for (const element of document.select("[data-minista-sprite]")) {
    const source = element
      .getAttribute("data-minista-sprite-src")
      ?.replace(/^\//, "")
    if (!source) continue
    const sourceDirectory = dirname(source)
    const output = outputs.resolve(
      createSpriteArtifactId(sourceDirectory),
      document.pageId,
    )
    if (!output) continue
    const symbolId =
      element.getAttribute("data-minista-sprite-symbol-id") ??
      filenameStem(source)
    element.setAttribute("href", `${output}#${symbolId}`)
    element.removeAttribute("data-minista-sprite")
    element.removeAttribute("data-minista-sprite-src")
    element.removeAttribute("data-minista-sprite-symbol-id")
    composed += 1
  }
  return composed
}

/**
 * @param {SpriteFeatureOptions} options
 * @param {SpriteBuilder} builder
 * @param {SpriteOutputResolver} outputs
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<SpriteFeatureOptions>}
 */
export function createSpriteFeature(options, builder, outputs) {
  return Object.freeze({
    id: SPRITE_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("sprite-assets")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const references = collectSpriteReferences(document)
          if (references.length === 0) continue
          const id = createNodeId("artifact", "sprite-references", document.pageId)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: SPRITE_FEATURE_ID,
            mediaType: "application/vnd.minista.sprite-references+json",
            content: JSON.stringify(references),
          })
          if (context.graph.snapshot().features.has(SPRITE_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: SPRITE_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [],
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async generate(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === SPRITE_FEATURE_ID &&
            record.mediaType ===
              "application/vnd.minista.sprite-references+json",
        )
        /** @type {SpriteReference[]} */
        const references = records.flatMap((record) =>
          JSON.parse(String(record.content)),
        )
        const directories = [
          ...new Set(references.map(({ sourceDirectory }) => sourceDirectory)),
        ].sort()
        if (context.graph.snapshot().features.has(SPRITE_FEATURE_ID)) {
          for (const source of [...new Set(references.map((item) => item.source))]) {
            const sourceReferences = references.filter(
              (reference) => reference.source === source,
            )
            context.graph.addAsset({
              id: createNodeId("asset", source),
              kind: "source",
              source: toProjectPath(source),
              consumers: [
                ...new Set(sourceReferences.map(({ pageId }) => pageId)),
              ],
            })
          }
        }
        for (const sourceDirectory of directories) {
          const id = createSpriteArtifactId(sourceDirectory)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: SPRITE_FEATURE_ID,
            mediaType: "image/svg+xml",
            content: await builder.build(sourceDirectory),
          })
          if (context.graph.snapshot().features.has(SPRITE_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "sprite",
              owner: SPRITE_FEATURE_ID,
              source: sourceDirectory,
              dependencies: records.map(({ id: dependency }) => dependency),
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      compose(context) {
        for (const document of context.documents.list()) {
          composeSpriteDocument(document, outputs)
        }
      },
    }),
  })
}
