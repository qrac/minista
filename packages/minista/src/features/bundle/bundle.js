// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./bundle.js").BundleBuilder} BundleBuilder */
/** @typedef {import("./bundle.js").BundleFeatureOptions} BundleFeatureOptions */
/** @typedef {import("./bundle.js").BundleOutputResolver} BundleOutputResolver */
/** @typedef {import("./bundle.js").BundlePlan} BundlePlan */

export const BUNDLE_FEATURE_ID = createNodeId("feature", "bundle")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * @param {string} value
 * @param {string} fileName
 * @param {string} output
 */
function replaceRootAsset(value, fileName, output) {
  return value.replace(
    new RegExp(`(^|,\\s*)/${escapeRegExp(fileName)}(?=([#?\\s,]|$))`, "g"),
    `$1${output}`,
  )
}

/**
 * @param {HtmlDocument} document
 * @param {BundlePlan} plan
 * @returns {readonly string[]}
 */
export function collectBundleOutputReferences(document, plan) {
  const references = new Set()
  if (document.select("head")[0]) {
    for (const fileName of plan.cssFiles) references.add(fileName)
  }
  if (!plan.rewriteRootImages) return Object.freeze([...references])
  for (const fileName of plan.imageFiles) {
    const used = document.select("*").some((element) =>
      ["href", "src", "srcset", "content", "poster"].some((attribute) => {
        const value = element.getAttribute(attribute)
        return value
          ? replaceRootAsset(value, fileName, fileName) !== value
          : false
      })
    )
    if (used) references.add(fileName)
  }
  return Object.freeze([...references])
}

/**
 * @param {HtmlDocument} document
 * @param {BundlePlan} plan
 * @param {BundleOutputResolver} outputs
 * @returns {number}
 */
export function composeBundleDocument(document, plan, outputs) {
  let composed = 0
  const head = document.select("head")[0]
  if (head) {
    for (const fileName of plan.cssFiles) {
      const output = outputs.resolve(fileName, document.pageId)
      if (!output) continue
      head.appendHtml(`<link rel="stylesheet" href="${output}">`)
      composed += 1
    }
  }
  if (!plan.rewriteRootImages) return composed
  for (const fileName of plan.imageFiles) {
    const output = outputs.resolve(fileName, document.pageId)
    if (!output) continue
    for (const element of document.select("*")) {
      for (const attribute of ["href", "src", "srcset", "content", "poster"]) {
        const value = element.getAttribute(attribute)
        if (!value) continue
        const next = replaceRootAsset(value, fileName, output)
        if (next === value) continue
        element.setAttribute(attribute, next)
        composed += 1
      }
    }
  }
  return composed
}

/**
 * @param {BundleFeatureOptions} options
 * @param {BundleBuilder} builder
 * @param {BundleOutputResolver} outputs
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<BundleFeatureOptions>}
 */
export function createBundleFeature(options, builder, outputs) {
  return Object.freeze({
    id: BUNDLE_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options, src: Object.freeze([...options.src]) }),
    requires: [capability("html-documents")],
    provides: [capability("client-bundle")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const id = createNodeId("artifact", "bundle-page", document.pageId)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: BUNDLE_FEATURE_ID,
            mediaType: "application/vnd.minista.bundle-page+json",
            content: JSON.stringify({ pageId: document.pageId }),
          })
          if (context.graph.snapshot().features.has(BUNDLE_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: BUNDLE_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [],
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async bundle(context) {
        const pages = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === BUNDLE_FEATURE_ID &&
            record.mediaType === "application/vnd.minista.bundle-page+json",
        )
        const plan = await builder.bundle(options)
        const id = createNodeId("artifact", "client-bundle-plan")
        await context.artifacts.put({
          schemaVersion: "1",
          id,
          owner: BUNDLE_FEATURE_ID,
          mediaType: "application/vnd.minista.client-bundle+json",
          content: JSON.stringify(plan),
        })
        for (const document of context.documents.list()) {
          const referencesId = createNodeId(
            "artifact",
            "bundle-output-references",
            document.pageId,
          )
          await context.artifacts.put({
            schemaVersion: "1",
            id: referencesId,
            owner: BUNDLE_FEATURE_ID,
            mediaType:
              "application/vnd.minista.bundle-output-references+json",
            content: JSON.stringify({
              pageId: document.pageId,
              fileNames: collectBundleOutputReferences(document, plan),
            }),
          })
          if (context.graph.snapshot().features.has(BUNDLE_FEATURE_ID)) {
            context.graph.addArtifact({
              id: referencesId,
              kind: "data",
              owner: BUNDLE_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [id],
            })
          }
        }
        if (context.graph.snapshot().features.has(BUNDLE_FEATURE_ID)) {
          context.graph.addArtifact({
            id,
            kind: "data",
            owner: BUNDLE_FEATURE_ID,
            source: options.outName,
            dependencies: pages.map(({ id: dependency }) => dependency),
          })
        }
      },
      /** @param {PhaseContext} context */
      async compose(context) {
        const record = (await context.artifacts.list()).find(
          (item) =>
            item.owner === BUNDLE_FEATURE_ID &&
            item.mediaType === "application/vnd.minista.client-bundle+json",
        )
        if (!record) return
        /** @type {BundlePlan} */
        const plan = JSON.parse(String(record.content))
        for (const document of context.documents.list()) {
          composeBundleDocument(document, plan, outputs)
        }
      },
    }),
  })
}
