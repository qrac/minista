// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("./image.js").ImageMutableElement} ImageMutableElement */
/** @typedef {import("../../core/graph/index.js").PageId} PageId */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./image.js").GeneratedImageArtifact} GeneratedImageArtifact */
/** @typedef {import("./image.js").GeneratedImagePlan} GeneratedImagePlan */
/** @typedef {import("./image.js").ImageComposition} ImageComposition */
/** @typedef {import("./image.js").ImageFeatureOptions} ImageFeatureOptions */
/** @typedef {import("./image.js").ImageGenerator} ImageGenerator */
/** @typedef {import("./image.js").ImageOutputResolver} ImageOutputResolver */
/** @typedef {import("./image.js").ImageReference} ImageReference */

export const IMAGE_FEATURE_ID = createNodeId("feature", "image")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {PageId} pageId */
function createImageReferencesArtifactId(pageId) {
  return createNodeId("artifact", "image-references", pageId)
}

export function createImagePlansArtifactId() {
  return createNodeId("artifact", "image-plans")
}

export function createImageOutputsArtifactId() {
  return createNodeId("artifact", "image-outputs")
}

/**
 * @param {HtmlDocument} document
 * @returns {readonly ImageReference[]}
 */
export function collectImageReferences(document) {
  return Object.freeze(
    document.select("[data-minista-image]").flatMap((element, index) => {
      const source = element.getAttribute("data-minista-image-src")
      if (!source || !["img", "source"].includes(element.tagName)) return []
      let optimize = {}
      const serialized = element.getAttribute("data-minista-image-optimize")
      if (serialized) optimize = JSON.parse(serialized)
      document.bind(element, {
        featureId: IMAGE_FEATURE_ID,
        nodeId: document.pageId,
      })
      return [
        Object.freeze({
          key: `${document.pageId}:${index}`,
          pageId: document.pageId,
          tagName: /** @type {"img" | "source"} */ (element.tagName),
          source,
          optimize: Object.freeze({ ...optimize }),
          sizes: element.getAttribute("sizes") ?? "",
          width: element.getAttribute("width") ?? "",
          height: element.getAttribute("height") ?? "",
        }),
      ]
    }),
  )
}

/**
 * @param {ImageMutableElement} element
 * @param {ImageComposition} composition
 */
export function applyImageComposition(element, composition) {
  element.setAttribute("srcset", composition.srcset)
  element.setAttribute("sizes", composition.sizes)
  element.setAttribute("width", String(composition.width))
  element.setAttribute("height", String(composition.height))
  element.removeAttribute("data-minista-image")
  element.removeAttribute("data-minista-image-src")
  element.removeAttribute("data-minista-image-optimize")
  if (element.tagName.toLowerCase() === "img" && composition.src) {
    element.setAttribute("src", composition.src)
  }
}

/**
 * @param {HtmlDocument} document
 * @param {readonly GeneratedImagePlan[]} plans
 * @param {ImageOutputResolver} outputs
 */
export function composeImageDocument(document, plans, outputs) {
  let composed = 0
  for (const [index, element] of document
    .select("[data-minista-image]")
    .entries()) {
    const plan = plans.find(
      ({ key }) => key === `${document.pageId}:${index}`,
    )
    if (!plan) continue
    const src = plan.src
      ? outputs.resolve(plan.src, document.pageId)
      : undefined
    const srcset = plan.srcset.flatMap(({ descriptor, artifactId }) => {
      const url = outputs.resolve(artifactId, document.pageId)
      return url ? [`${url} ${descriptor}`] : []
    })
    if (srcset.length === 0) continue
    applyImageComposition(element, {
      src,
      srcset: srcset.join(", "),
      sizes: plan.sizes,
      width: plan.width,
      height: plan.height,
    })
    composed += 1
  }
  return composed
}

/**
 * @param {ImageFeatureOptions} options
 * @param {ImageGenerator} generator
 * @param {ImageOutputResolver} outputs
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<ImageFeatureOptions>}
 */
export function createImageFeature(options, generator, outputs) {
  return Object.freeze({
    id: IMAGE_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("image-assets")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const references = collectImageReferences(document)
          if (references.length === 0) continue
          const id = createImageReferencesArtifactId(document.pageId)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: IMAGE_FEATURE_ID,
            mediaType: "application/vnd.minista.image-references+json",
            content: JSON.stringify(references),
            scope: { kind: "page", pageId: document.pageId },
          })
          if (context.graph.snapshot().features.has(IMAGE_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: IMAGE_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [],
              scope: { kind: "page", pageId: document.pageId },
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async generate(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === IMAGE_FEATURE_ID &&
            record.mediaType ===
              "application/vnd.minista.image-references+json",
        )
        /** @type {ImageReference[]} */
        const references = records.flatMap((record) =>
          JSON.parse(String(record.content)),
        )
        const generated = await generator.generate(references, options)
        for (const artifact of generated.artifacts) {
          await context.artifacts.put({
            schemaVersion: "1",
            id: artifact.id,
            owner: IMAGE_FEATURE_ID,
            mediaType: artifact.mediaType,
            content: artifact.content,
          })
        }
        const plansId = createImagePlansArtifactId()
        await context.artifacts.put({
          schemaVersion: "1",
          id: plansId,
          owner: IMAGE_FEATURE_ID,
          mediaType: "application/vnd.minista.image-plans+json",
          content: JSON.stringify(generated.plans),
        })
        const outputsId = createImageOutputsArtifactId()
        await context.artifacts.put({
          schemaVersion: "1",
          id: outputsId,
          owner: IMAGE_FEATURE_ID,
          mediaType: "application/vnd.minista.image-outputs+json",
          content: JSON.stringify(generated.artifacts.map((artifact) => ({
            id: artifact.id,
            source: artifact.source,
            fileName: artifact.fileName,
            mediaType: artifact.mediaType,
          }))),
        })
        if (context.graph.snapshot().features.has(IMAGE_FEATURE_ID)) {
          const sourcePages = new Map()
          for (const reference of references) {
            const pages = sourcePages.get(reference.source) ?? new Set()
            pages.add(reference.pageId)
            sourcePages.set(reference.source, pages)
          }
          for (const [source, pages] of sourcePages) {
            const imageId = createNodeId("image", source)
            const generatedAssets = generated.artifacts
              .filter((artifact) => artifact.source === source)
              .map((artifact) => createNodeId("asset", artifact.id))
            context.graph.addImage({
              id: imageId,
              source,
              pages: [...pages],
              generatedAssets,
            })
            for (const [index, artifact] of generated.artifacts
              .filter((item) => item.source === source)
              .entries()) {
              context.graph.addAsset({
                id: generatedAssets[index],
                kind: "generated",
                consumers: [...pages],
              })
              context.graph.addArtifact({
                id: artifact.id,
                kind: "image",
                owner: IMAGE_FEATURE_ID,
                source,
                dependencies: records.map(({ id }) => id),
              })
            }
          }
          context.graph.addArtifact({
            id: plansId,
            kind: "data",
            owner: IMAGE_FEATURE_ID,
            source: "image-plans",
            dependencies: generated.artifacts.map(({ id }) => id),
          })
          context.graph.addArtifact({
            id: outputsId,
            kind: "data",
            owner: IMAGE_FEATURE_ID,
            source: "image-outputs",
            dependencies: generated.artifacts.map(({ id }) => id),
          })
        }
      },
      /** @param {PhaseContext} context */
      async compose(context) {
        const record = await context.artifacts.get(createImagePlansArtifactId())
        if (!record) return
        /** @type {GeneratedImagePlan[]} */
        const plans = JSON.parse(String(record.content))
        for (const document of context.documents.list()) {
          composeImageDocument(document, plans, outputs)
        }
      },
    }),
  })
}
