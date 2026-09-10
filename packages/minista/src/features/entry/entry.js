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

/** @param {EntryFeatureOptions} options */
export function createEntryFeatureDescriptor(options) {
  return Object.freeze({
    id: ENTRY_FEATURE_ID,
    apiVersion: /** @type {const} */ (1),
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents")],
    provides: [capability("asset-entries")],
    optionalAfter: ["comment", "svg"].map((id) => createNodeId("feature", id)),
  })
}

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

// Collection and composition intentionally share this element/attribute contract.
const targets = [
  ["link[href]", "href"],
  ["script[src]", "src"],
  ["img[src]", "src"],
  ["img[srcset]", "srcset"],
  ["source[srcset]", "srcset"],
  ["use[href]", "href"],
]

/**
 * Keep URL ranges so query, fragment, descriptors and whitespace survive edits.
 * Commas inside a srcset URL (including data URLs) are not separators.
 * @param {string} value
 * @param {string} attribute
 */
function referenceRanges(value, attribute) {
  const ranges = []
  if (attribute !== "srcset") {
    const start = value.search(/\S/)
    if (start >= 0) ranges.push({ start, end: value.trimEnd().length })
  } else {
    let cursor = 0
    while (cursor < value.length) {
      while (/[\t\n\f\r ,]/.test(value[cursor] ?? "") && cursor < value.length) cursor++
      const start = cursor
      while (cursor < value.length && !/[\t\n\f\r ]/.test(value[cursor])) cursor++
      let end = cursor
      while (value[end - 1] === ",") end--
      if (end > start) ranges.push({ start, end })
      if (end < cursor) continue
      let parentheses = 0
      while (cursor < value.length) {
        const character = value[cursor++]
        if (character === "(") parentheses++
        if (character === ")") parentheses--
        if (character === "," && parentheses === 0) break
      }
    }
  }
  return ranges.flatMap(({ start, end }) => {
    const url = value.slice(start, end)
    const source = url.split(/[?#]/)[0]
    if (!source.startsWith("/") || source.startsWith("//") || source.length === 1 || /\s/.test(source)) return []
    return [{ start, end: start + source.length, source: source.slice(1) }]
  })
}

/**
 * @param {HtmlDocument} document
 * @returns {readonly EntryReference[]}
 */
export function collectEntryReferences(document) {
  /** @type {EntryReference[]} */
  const references = []
  for (const [selector, attribute] of targets) {
    for (const element of document.select(selector)) {
      const value = element.getAttribute(attribute)
      if (!value) continue
      for (const { source } of referenceRanges(value, attribute)) {
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
  const usedOutputs = new Set()
  for (const [selector, attribute] of targets) {
    for (const element of document.select(selector)) {
      const value = element.getAttribute(attribute)
      if (!value) continue
      let next = value
      // Read each original URL once: generated URLs must not become new sources.
      for (const { start, end, source } of referenceRanges(value, attribute).reverse()) {
        const output = outputs.find((item) => item.source === source)
        if (!output) continue
        const url = resolver.resolve(output.fileName, document.pageId)
        if (!url) continue
        usedOutputs.add(output)
        next = next.slice(0, start) + url + next.slice(end)
      }
      if (next === value) continue
      element.setAttribute(attribute, next)
      composed += 1
    }
  }
  const head = document.select("head")[0]
  if (head) {
    const styles = new Set(document.select('link[rel="stylesheet"][href]')
      .map((element) => element.getAttribute("href")))
    for (const output of usedOutputs) {
      for (const cssFile of output.cssFiles) {
        const cssUrl = resolver.resolve(cssFile, document.pageId)
        if (!cssUrl || styles.has(cssUrl)) continue
        styles.add(cssUrl)
        const escapedUrl = cssUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
        head.appendHtml(`<link rel="stylesheet" href="${escapedUrl}">`)
      }
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
    ...createEntryFeatureDescriptor(options),
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
          if (context.graph.hasFeature(ENTRY_FEATURE_ID)) {
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
        if (context.graph.hasFeature(ENTRY_FEATURE_ID)) {
          // A later bundle lifecycle can receive analyzed artifacts as explicit
          // input. Restore their graph nodes before adding plan dependencies.
          const existingArtifacts = context.graph.snapshot().artifacts
          const referencePages = new Map(references.map(({ pageId }) => [
            createNodeId("artifact", "entry-references", pageId), pageId,
          ]))
          for (const record of records) {
            if (existingArtifacts.has(record.id)) continue
            context.graph.addArtifact({
              id: record.id,
              kind: "data",
              owner: ENTRY_FEATURE_ID,
              source: `page:${referencePages.get(record.id)}`,
              dependencies: [],
            })
          }
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
