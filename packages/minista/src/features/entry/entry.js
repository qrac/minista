// @ts-check

import { createNodeId, toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/graph/index.js").PageId} PageId */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./entry.js").EntryBundleOutput} EntryBundleOutput */
/** @typedef {import("./entry.js").EntryBundler} EntryBundler */
/** @typedef {import("./entry.js").EntryFeatureOptions} EntryFeatureOptions */
/** @typedef {import("./entry.js").EntryOutputResolver} EntryOutputResolver */
/** @typedef {import("./entry.js").EntryReference} EntryReference */

export const ENTRY_FEATURE_ID = createNodeId("feature", "entry")

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
 * @returns {readonly string[]}
 */
function collectRootPaths(value) {
  return Object.freeze(
    value.split(",").flatMap((part) => {
      const source = part.trim().split(/[#? ]/)[0]
      return source?.startsWith("/") ? [source.slice(1)] : []
    }),
  )
}

/**
 * @param {string} value
 * @param {string} source
 * @param {string} output
 */
function replaceReference(value, source, output) {
  return value.replace(
    new RegExp(`(^|,\\s*)/${escapeRegExp(source)}(?=([#?\\s,]|$))`, "g"),
    `$1${output}`,
  )
}

/**
 * @param {HtmlDocument} document
 * @returns {readonly EntryReference[]}
 */
export function collectEntryReferences(document) {
  /** @type {EntryReference[]} */
  const references = []
  const targets = [
    ["link[href]", "href"],
    ["script[src]", "src"],
    ["img[src]", "src"],
    ["img[srcset]", "srcset"],
    ["source[srcset]", "srcset"],
    ["use[href]", "href"],
  ]
  for (const [selector, attribute] of targets) {
    for (const element of document.select(selector)) {
      const value = element.getAttribute(attribute)
      if (!value) continue
      for (const source of collectRootPaths(value)) {
        references.push(
          Object.freeze({ pageId: document.pageId, source, attribute }),
        )
      }
    }
  }
  return Object.freeze(
    references.filter(
      (reference, index) =>
        references.findIndex(
          (item) =>
            item.pageId === reference.pageId &&
            item.source === reference.source &&
            item.attribute === reference.attribute,
        ) === index,
    ),
  )
}

/**
 * @param {HtmlDocument} document
 * @param {readonly EntryBundleOutput[]} outputs
 * @param {EntryOutputResolver} resolver
 * @returns {number}
 */
export function composeEntryDocument(document, outputs, resolver) {
  let composed = 0
  for (const output of outputs) {
    const url = resolver.resolve(output.fileName, document.pageId)
    if (!url) continue
    for (const element of document.select("*")) {
      for (const attribute of ["href", "src", "srcset", "content", "poster"]) {
        const value = element.getAttribute(attribute)
        if (!value) continue
        const next = replaceReference(value, output.source, url)
        if (next === value) continue
        element.setAttribute(attribute, next)
        composed += 1
      }
    }
    const head = document.select("head")[0]
    if (!head) continue
    for (const cssFile of output.cssFiles) {
      const cssUrl = resolver.resolve(cssFile, document.pageId)
      if (cssUrl) head.appendHtml(`<link rel="stylesheet" href="${cssUrl}">`)
    }
  }
  return composed
}

/**
 * @param {EntryFeatureOptions} options
 * @param {EntryBundler} bundler
 * @param {EntryOutputResolver} outputs
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<EntryFeatureOptions>}
 */
export function createEntryFeature(options, bundler, outputs) {
  return Object.freeze({
    id: ENTRY_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("asset-entries")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        for (const document of context.documents.list()) {
          const references = collectEntryReferences(document)
          if (references.length === 0) continue
          const id = createNodeId("artifact", "entry-references", document.pageId)
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: ENTRY_FEATURE_ID,
            mediaType: "application/vnd.minista.entry-references+json",
            content: JSON.stringify(references),
          })
          if (context.graph.snapshot().features.has(ENTRY_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: ENTRY_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [],
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async bundle(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === ENTRY_FEATURE_ID &&
            record.mediaType ===
              "application/vnd.minista.entry-references+json",
        )
        /** @type {EntryReference[]} */
        const references = records.flatMap((record) =>
          JSON.parse(String(record.content)),
        )
        const unique = references.filter(
          (reference, index) =>
            references.findIndex(({ source }) => source === reference.source) ===
            index,
        )
        const bundled = await bundler.bundle(unique)
        const id = createNodeId("artifact", "entry-bundle-plan")
        await context.artifacts.put({
          schemaVersion: "1",
          id,
          owner: ENTRY_FEATURE_ID,
          mediaType: "application/vnd.minista.entry-bundle+json",
          content: JSON.stringify(bundled),
        })
        if (context.graph.snapshot().features.has(ENTRY_FEATURE_ID)) {
          for (const reference of unique) {
            context.graph.addAsset({
              id: createNodeId("asset", reference.source),
              kind: "source",
              source: toProjectPath(reference.source),
              consumers: [
                ...new Set(
                  references
                    .filter(({ source }) => source === reference.source)
                    .map(({ pageId }) => pageId),
                ),
              ],
            })
          }
          context.graph.addArtifact({
            id,
            kind: "data",
            owner: ENTRY_FEATURE_ID,
            source: "entry-bundle",
            dependencies: records.map(({ id: dependency }) => dependency),
          })
        }
      },
      /** @param {PhaseContext} context */
      async compose(context) {
        const record = (await context.artifacts.list()).find(
          (item) =>
            item.owner === ENTRY_FEATURE_ID &&
            item.mediaType === "application/vnd.minista.entry-bundle+json",
        )
        if (!record) return
        /** @type {EntryBundleOutput[]} */
        const bundled = JSON.parse(String(record.content))
        for (const document of context.documents.list()) {
          composeEntryDocument(document, bundled, outputs)
        }
      },
    }),
  })
}
