// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/graph/index.js").PageId} PageId */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./island.js").IslandBundleOutput} IslandBundleOutput */
/** @typedef {import("./island.js").IslandBundler} IslandBundler */
/** @typedef {import("./island.js").IslandEntryGenerator} IslandEntryGenerator */
/** @typedef {import("./island.js").IslandFeatureOptions} IslandFeatureOptions */
/** @typedef {import("./island.js").IslandOutputResolver} IslandOutputResolver */
/** @typedef {import("./island.js").IslandReference} IslandReference */
/** @typedef {import("./island.js").IslandSourcePlan} IslandSourcePlan */

export const ISLAND_FEATURE_ID = createNodeId("feature", "island")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {IslandFeatureOptions} options */
function markerAttribute(options) {
  const prefix = options.rootAttrName ? `${options.rootAttrName}-` : ""
  return `data-${prefix}client-snippet`
}

/** @param {IslandFeatureOptions} options */
function directiveAttribute(options) {
  const prefix = options.rootAttrName ? `${options.rootAttrName}-` : ""
  return `data-${prefix}client-directive`
}

/** @param {string} value */
function stableKey(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function createIslandSnippetsArtifactId() {
  return createNodeId("artifact", "island-snippets")
}

export function createIslandSourcePlanArtifactId() {
  return createNodeId("artifact", "island-source-plan")
}

export function createIslandBundleArtifactId() {
  return createNodeId("artifact", "island-bundle-plan")
}

/**
 * @param {unknown} value
 * @returns {readonly string[]}
 */
export function parseIslandSnippets(value) {
  if (!Array.isArray(value) ||
    !value.every((snippet) => typeof snippet === "string")) {
    throw new TypeError("Island snippets must be an array of strings.")
  }
  return Object.freeze([...value])
}

/**
 * @param {HtmlDocument} document
 * @param {IslandFeatureOptions} options
 * @returns {readonly IslandReference[]}
 */
export function collectIslandReferences(document, options) {
  const marker = markerAttribute(options)
  const directive = directiveAttribute(options)
  return Object.freeze(
    document.select(`[${marker}]`).flatMap((element) => {
      const snippet = element.getAttribute(marker)
      if (!snippet) return []
      document.bind(element, {
        featureId: ISLAND_FEATURE_ID,
        nodeId: document.pageId,
      })
      return [
        Object.freeze({
          pageId: document.pageId,
          snippet,
          directive: element.getAttribute(directive) ?? "load",
        }),
      ]
    }),
  )
}

/**
 * @param {readonly IslandReference[]} references
 * @param {IslandFeatureOptions} options
 * @param {IslandEntryGenerator} generator
 * @returns {Promise<IslandSourcePlan>}
 */
export async function createIslandSourcePlan(references, options, generator) {
  const snippets = [...new Set(references.map(({ snippet }) => snippet))]
  const pageIds = [...new Set(references.map(({ pageId }) => pageId))]
  /** @type {Map<string, number>} */
  const patternIndexes = new Map()
  /** @type {Record<string, number>} */
  const pagePatterns = {}
  /** @type {{ index: number, snippetIndexes: readonly number[] }[]} */
  const patterns = []

  for (const pageId of pageIds) {
    const used = options.useSplitPages
      ? snippets.flatMap((snippet, index) =>
          references.some(
            (reference) =>
              reference.pageId === pageId && reference.snippet === snippet,
          )
            ? [index + 1]
            : [],
        )
      : snippets.map((_, index) => index + 1)
    if (used.length === 0) continue
    const patternId = used.join(",")
    let patternIndex = patternIndexes.get(patternId)
    if (!patternIndex) {
      patternIndex = patternIndexes.size + 1
      patternIndexes.set(patternId, patternIndex)
      patterns.push(Object.freeze({ index: patternIndex, snippetIndexes: used }))
    }
    pagePatterns[pageId] = patternIndex
  }
  return Object.freeze({
    snippets: Object.freeze(
      await Promise.all(
        snippets.map(async (snippet, index) =>
          Object.freeze({
            index: index + 1,
            encoded: snippet,
            code: await generator.createSnippet(snippet),
          }),
        ),
      ),
    ),
    entries: Object.freeze(
      await Promise.all(
        patterns.map(async (pattern) =>
          Object.freeze({
            patternIndex: pattern.index,
            fileName: options.outName.replace(
              /\[index\]/g,
              String(pattern.index),
            ),
            snippetIndexes: pattern.snippetIndexes,
            code: await generator.createEntry(pattern.snippetIndexes, options),
          }),
        ),
      ),
    ),
    pagePatterns: Object.freeze(pagePatterns),
  })
}

/**
 * @param {HtmlDocument} document
 * @param {IslandSourcePlan} sourcePlan
 * @param {readonly IslandBundleOutput[]} bundleOutputs
 * @param {IslandFeatureOptions} options
 * @param {IslandOutputResolver} outputs
 */
export function composeIslandDocument(
  document,
  sourcePlan,
  bundleOutputs,
  options,
  outputs,
) {
  const patternIndex = sourcePlan.pagePatterns[document.pageId]
  if (!patternIndex) return 0
  const marker = markerAttribute(options)
  let composed = 0
  for (const element of document.select(`[${marker}]`)) {
    const snippet = element.getAttribute(marker)
    const source = sourcePlan.snippets.find(({ encoded }) => encoded === snippet)
    if (!source) continue
    element.setAttribute(marker, String(source.index))
    composed += 1
  }
  const bundle = bundleOutputs.find(
    (output) => output.patternIndex === patternIndex,
  )
  const head = document.select("head")[0]
  if (!bundle || !head) return composed
  for (const cssFile of bundle.cssFiles) {
    const cssUrl = outputs.resolve(cssFile, document.pageId)
    if (cssUrl) head.appendHtml(`<link rel="stylesheet" href="${cssUrl}">`)
  }
  const scriptUrl = outputs.resolve(bundle.fileName, document.pageId)
  if (scriptUrl) {
    head.appendHtml(`<script type="module" src="${scriptUrl}"></script>`)
  }
  return composed
}

/**
 * @param {IslandFeatureOptions} options
 * @param {IslandEntryGenerator} generator
 * @param {IslandBundler} bundler
 * @param {IslandOutputResolver} outputs
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<IslandFeatureOptions>}
 */
export function createIslandFeature(options, generator, bundler, outputs) {
  return Object.freeze({
    id: ISLAND_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({
      ...options,
      rootStyle: Object.freeze({ ...options.rootStyle }),
    }),
    requires: [capability("html-documents")],
    provides: [capability("island-entries")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async analyze(context) {
        /** @type {IslandReference[]} */
        const allReferences = []
        for (const document of context.documents.list()) {
          const references = collectIslandReferences(document, options)
          if (references.length === 0) continue
          allReferences.push(...references)
          const id = createNodeId(
            "artifact",
            "island-references",
            document.pageId,
          )
          await context.artifacts.put({
            schemaVersion: "1",
            id,
            owner: ISLAND_FEATURE_ID,
            mediaType: "application/vnd.minista.island-references+json",
            content: JSON.stringify(references),
            scope: { kind: "page", pageId: document.pageId },
          })
          if (context.graph.snapshot().features.has(ISLAND_FEATURE_ID)) {
            context.graph.addArtifact({
              id,
              kind: "data",
              owner: ISLAND_FEATURE_ID,
              source: `page:${document.pageId}`,
              dependencies: [],
              scope: { kind: "page", pageId: document.pageId },
            })
          }
        }
        if (context.graph.snapshot().features.has(ISLAND_FEATURE_ID)) {
          for (const snippet of [
            ...new Set(allReferences.map(({ snippet }) => snippet)),
          ]) {
            const references = allReferences.filter(
              (reference) => reference.snippet === snippet,
            )
            context.graph.addIsland({
              id: createNodeId("island", stableKey(snippet)),
              componentModuleId: `snippet:${stableKey(snippet)}`,
              directive: references[0]?.directive ?? "load",
              pages: [...new Set(references.map(({ pageId }) => pageId))],
            })
          }
        }
      },
      /** @param {PhaseContext} context */
      async generate(context) {
        const records = (await context.artifacts.list()).filter(
          (record) =>
            record.owner === ISLAND_FEATURE_ID &&
            record.mediaType ===
              "application/vnd.minista.island-references+json",
        )
        /** @type {IslandReference[]} */
        const references = records.flatMap((record) =>
          JSON.parse(String(record.content)),
        )
        const snippetsRecord = await context.artifacts.get(
          createIslandSnippetsArtifactId(),
        )
        if (snippetsRecord) {
          const snippets = parseIslandSnippets(
            JSON.parse(String(snippetsRecord.content)),
          )
          references.sort((left, right) => {
            const leftIndex = snippets.indexOf(left.snippet)
            const rightIndex = snippets.indexOf(right.snippet)
            return (leftIndex < 0 ? snippets.length : leftIndex) -
              (rightIndex < 0 ? snippets.length : rightIndex)
          })
        }
        const plan = await createIslandSourcePlan(references, options, generator)
        await context.artifacts.put({
          schemaVersion: "1",
          id: createIslandSourcePlanArtifactId(),
          owner: ISLAND_FEATURE_ID,
          mediaType: "application/vnd.minista.island-sources+json",
          content: JSON.stringify(plan),
        })
        if (context.graph.snapshot().features.has(ISLAND_FEATURE_ID)) {
          context.graph.addArtifact({
            id: createIslandSourcePlanArtifactId(),
            kind: "data",
            owner: ISLAND_FEATURE_ID,
            source: "island-sources",
            dependencies: records.map(({ id }) => id),
          })
        }
      },
      /** @param {PhaseContext} context */
      async bundle(context) {
        const record = await context.artifacts.get(
          createIslandSourcePlanArtifactId(),
        )
        if (!record) return
        /** @type {IslandSourcePlan} */
        const plan = JSON.parse(String(record.content))
        const bundled = await bundler.bundle(plan)
        await context.artifacts.put({
          schemaVersion: "1",
          id: createIslandBundleArtifactId(),
          owner: ISLAND_FEATURE_ID,
          mediaType: "application/vnd.minista.island-bundle+json",
          content: JSON.stringify(bundled),
        })
        if (context.graph.snapshot().features.has(ISLAND_FEATURE_ID)) {
          context.graph.addArtifact({
            id: createIslandBundleArtifactId(),
            kind: "data",
            owner: ISLAND_FEATURE_ID,
            source: "island-bundle",
            dependencies: [createIslandSourcePlanArtifactId()],
          })
        }
      },
      /** @param {PhaseContext} context */
      async compose(context) {
        const sourceRecord = await context.artifacts.get(
          createIslandSourcePlanArtifactId(),
        )
        const bundleRecord = await context.artifacts.get(
          createIslandBundleArtifactId(),
        )
        if (!sourceRecord || !bundleRecord) return
        /** @type {IslandSourcePlan} */
        const sourcePlan = JSON.parse(String(sourceRecord.content))
        /** @type {IslandBundleOutput[]} */
        const bundled = JSON.parse(String(bundleRecord.content))
        for (const document of context.documents.list()) {
          composeIslandDocument(document, sourcePlan, bundled, options, outputs)
        }
      },
    }),
  })
}
