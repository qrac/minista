// @ts-check

import { NodeHtmlDocumentFactory } from "../html/index.js"
import {
  MemoryArtifactStore,
  MemoryEmitter,
} from "../../core/artifacts/index.js"
import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { MemoryHtmlDocumentStore } from "../../core/document/index.js"
import {
  createNodeId,
  ProjectGraph,
  toProjectPath,
} from "../../core/graph/index.js"
import { LifecycleRunner } from "../../core/lifecycle/index.js"

const documents = new NodeHtmlDocumentFactory()

export class ViteCompatibilityLifecycleError extends Error {
  code = "MINISTA_VITE_COMPATIBILITY_LIFECYCLE_FAILED"

  /** @param {readonly import("../../core/diagnostics/index.js").Diagnostic[]} diagnostics */
  constructor(diagnostics) {
    super(diagnostics.map(({ code, message }) => `[${code}] ${message}`).join("\n"))
    this.name = "ViteCompatibilityLifecycleError"
    this.diagnostics = diagnostics
  }
}

/**
 * Accumulate compatibility phase events in the build session without exposing
 * Vite objects to Core lifecycle hooks.
 *
 * @param {import("./build-session.js").ViteBuildSession | undefined} session
 * @param {string} scope
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityDocumentHooks} [hooks]
 */
export function createViteCompatibilityTraceHooks(
  session,
  scope,
  hooks = {},
) {
  return {
    ...hooks,
    ...(session ? { session } : {}),
    /** @param {import("../../core/lifecycle/index.js").PhaseTraceEvent} event */
    onTrace(event) {
      if (session?.state) {
        session.state.compatibilityTraces ??= []
        session.state.compatibilityTraces.push(Object.freeze({
          scope,
          ...event,
        }))
      }
      hooks.onTrace?.(event)
    },
  }
}

/**
 * @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityRunHooks} [hooks]
 */
async function createLifecycle(features, hooks = {}) {
  const session = hooks.session
  const diagnostics = session?.diagnostics ?? new DiagnosticCollector()
  const graph = new ProjectGraph({
    id: createNodeId("project", "vite-compatibility"),
    name: "vite-compatibility",
    root: toProjectPath("."),
  }, diagnostics)
  graph.addFeature({
    id: createNodeId("feature", "vite-compatibility-input"),
    apiVersion: 1,
    provides: ["html-documents", "output-files"],
    requires: [],
  })
  for (const feature of features) {
    graph.addFeature({
      id: feature.id,
      apiVersion: feature.apiVersion,
      provides: feature.provides ?? [],
      requires: feature.requires ?? [],
    })
  }
  const documentStore = session?.state
    ? session.state.compatibilityDocuments ??= new MemoryHtmlDocumentStore()
    : new MemoryHtmlDocumentStore()
  const artifacts = session?.artifacts ?? new MemoryArtifactStore()
  if (session) {
    const owners = new Set(features.map(({ id }) => id))
    for (const artifact of await artifacts.list()) {
      if (owners.has(artifact.owner)) await artifacts.delete(artifact.id)
    }
  }
  const emitter = new MemoryEmitter()
  const inputCapabilities = /** @type {readonly import("../../core/types.js").Capability[]} */ (
    /** @type {unknown} */ (["html-documents", "output-files"])
  )
  return {
    diagnostics,
    documents: documentStore,
    artifacts,
    emitter,
    graph,
    runner: new LifecycleRunner([
      Object.freeze({
        id: createNodeId("feature", "vite-compatibility-input"),
        apiVersion: /** @type {const} */ (1),
        options: Object.freeze({}),
        provides: inputCapabilities,
        hooks: Object.freeze({}),
      }),
      ...features,
    ], {
      graph,
      diagnostics,
      documents: documentStore,
      artifacts,
      emitter,
    }),
  }
}

/**
 * @param {ReturnType<typeof createLifecycle> extends Promise<infer T> ? T : never} lifecycle
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityRunHooks} hooks
 * @param {string} identity
 * @param {import("../../core/graph/index.js").PageId} pageId
 * @param {string} html
 */
function getDocument(lifecycle, hooks, identity, pageId, html) {
  const ids = hooks.session?.state
    ? hooks.session.state.compatibilityDocumentIds ??= new Map()
    : undefined
  const currentId = ids?.get(identity)
  let document = currentId ? lifecycle.documents.get(currentId) : undefined
  if (document && document.pageId !== pageId) {
    lifecycle.documents.delete(document.pageId)
    document = undefined
  }
  if (!document || document.serialize() !== html) {
    document = documents.parse({ pageId, html })
    lifecycle.documents.replace(document)
  }
  ids?.set(identity, pageId)
  return document
}

/** @template {string} Id @template {{readonly id: Id}} Node @param {ReadonlyMap<Id, Node>} current @param {ReadonlyMap<Id, Node>} incoming @returns {Map<Id, Node>} */
function mergeNodes(current, incoming) {
  return new Map([...current, ...incoming])
}

/**
 * @param {import("../../core/graph/index.js").ProjectGraphSnapshot | undefined} current
 * @param {import("../../core/graph/index.js").ProjectGraphSnapshot} incoming
 */
function mergeGraph(current, incoming) {
  if (!current) return incoming
  const assets = mergeNodes(current.assets, incoming.assets)
  for (const [id, node] of incoming.assets) {
    const previous = current.assets.get(id)
    if (!previous) continue
    assets.set(id, Object.freeze({
      ...previous,
      ...node,
      consumers: Object.freeze([
        ...new Set([...previous.consumers, ...node.consumers]),
      ]),
      output: node.output ?? previous.output,
    }))
  }
  const islands = mergeNodes(current.islands, incoming.islands)
  for (const [id, node] of incoming.islands) {
    const previous = current.islands.get(id)
    if (!previous) continue
    islands.set(id, Object.freeze({
      ...previous,
      ...node,
      pages: Object.freeze([...new Set([...previous.pages, ...node.pages])]),
    }))
  }
  const images = mergeNodes(current.images, incoming.images)
  for (const [id, node] of incoming.images) {
    const previous = current.images.get(id)
    if (!previous) continue
    images.set(id, Object.freeze({
      ...previous,
      ...node,
      pages: Object.freeze([...new Set([...previous.pages, ...node.pages])]),
      generatedAssets: Object.freeze([
        ...new Set([...previous.generatedAssets, ...node.generatedAssets]),
      ]),
    }))
  }
  return Object.freeze({
    schemaVersion: /** @type {const} */ ("1"),
    project: current.project,
    features: mergeNodes(current.features, incoming.features),
    routes: mergeNodes(current.routes, incoming.routes),
    pages: mergeNodes(current.pages, incoming.pages),
    assets,
    islands,
    images,
    artifacts: mergeNodes(current.artifacts, incoming.artifacts),
  })
}

/**
 * @param {{graph: ProjectGraph, emitter: MemoryEmitter}} lifecycle
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityRunHooks} hooks
 */
async function commitLifecycle(lifecycle, hooks) {
  const state = hooks.session?.state
  if (!state) return
  state.compatibilityGraph = mergeGraph(
    state.compatibilityGraph,
    lifecycle.graph.snapshot(),
  )
  state.compatibilityEmitter ??= new MemoryEmitter()
  const current = new Set(
    (await state.compatibilityEmitter.list()).map(({ fileName }) => fileName),
  )
  for (const file of await lifecycle.emitter.list()) {
    if (current.has(file.fileName)) {
      await state.compatibilityEmitter.replace(file)
    } else {
      await state.compatibilityEmitter.emit(file)
      current.add(file.fileName)
    }
  }
}

/**
 * Run document-oriented domain phases against a complete Vite HTML output set.
 *
 * @param {readonly import("./compatibility-lifecycle.js").ViteCompatibilityDocumentInput[]} pages
 * @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features
 * @param {readonly import("../../core/types.js").BuildPhase[]} [phases]
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityDocumentHooks} [hooks]
 * @returns {Promise<import("./compatibility-lifecycle.js").ViteCompatibilityDocumentResult>}
 */
export async function processViteDocuments(
  pages,
  features,
  phases = ["analyze", "generate", "compose"],
  hooks = {},
) {
  const lifecycle = await createLifecycle(features, hooks)
  /** @type {{input: import("./compatibility-lifecycle.js").ViteCompatibilityDocumentInput, document: import("../../core/document/index.js").HtmlDocument, before: string}[]} */
  const states = []

  for (const artifact of hooks.inputArtifacts ?? []) {
    await lifecycle.artifacts.put(artifact)
  }

  for (const page of pages) {
    const routeId = createNodeId("route", "vite-output", page.fileName)
    const pageId = createNodeId("page", routeId, page.url)
    lifecycle.graph.addRoute({
      id: routeId,
      sourceFile: toProjectPath(page.fileName),
      pattern: page.url,
      params: [],
      pageModuleId: page.fileName,
    })
    lifecycle.graph.addPage({
      id: pageId,
      routeId,
      url: page.url,
      params: {},
      props: {},
      metadata: {},
      draft: false,
    })
    const document = getDocument(
      lifecycle,
      hooks,
      page.fileName,
      pageId,
      page.html,
    )
    states.push({ input: page, document, before: document.serialize() })
  }

  const composeIndex = phases.indexOf("compose")
  if (hooks.beforeCompose && composeIndex >= 0) {
    const beforeCompose = phases.slice(0, composeIndex)
    if (beforeCompose.length > 0) {
      await run(lifecycle, beforeCompose, hooks.onTrace)
    }
    await hooks.beforeCompose(Object.freeze({
      artifacts: await lifecycle.artifacts.list(),
      graph: lifecycle.graph.snapshot(),
    }))
    await run(lifecycle, phases.slice(composeIndex), hooks.onTrace)
  } else {
    await run(lifecycle, phases, hooks.onTrace)
  }
  const graph = lifecycle.graph.snapshot()
  await commitLifecycle(lifecycle, hooks)
  return Object.freeze({
    documents: Object.freeze(states.map(({ input, document, before }) => {
      const after = document.serialize()
      return Object.freeze({
        fileName: input.fileName,
        url: input.url,
        html: after === before ? input.html : after,
      })
    })),
    artifacts: await lifecycle.artifacts.list(),
    graph,
  })
}

/** @param {{runner: LifecycleRunner, diagnostics: DiagnosticCollector}} lifecycle @param {readonly import("../../core/types.js").BuildPhase[]} phases @param {(event: import("../../core/lifecycle/index.js").PhaseTraceEvent) => void} [onTrace] */
async function run(lifecycle, phases, onTrace) {
  const result = await lifecycle.runner.run({ phases, onTrace })
  if (!result.ok) {
    throw new ViteCompatibilityLifecycleError(
      lifecycle.diagnostics.snapshot(),
    )
  }
}

/**
 * @param {string} html
 * @param {string} pageIdentity
 * @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityRunHooks} [hooks]
 */
export async function composeViteHtml(html, pageIdentity, features, hooks = {}) {
  const lifecycle = await createLifecycle(features, hooks)
  const document = getDocument(
    lifecycle,
    hooks,
    pageIdentity,
    createNodeId("page", "vite-compatibility", pageIdentity),
    html,
  )
  const before = document.serialize()
  await run(lifecycle, ["compose"], hooks.onTrace)
  const after = document.serialize()
  await commitLifecycle(lifecycle, hooks)
  return after === before ? html : after
}

/**
 * @param {readonly import("../../core/artifacts/index.js").EmittedFile[]} files
 * @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features
 * @param {import("./compatibility-lifecycle.js").ViteCompatibilityRunHooks} [hooks]
 */
export async function processViteOutputs(files, features, hooks = {}) {
  const lifecycle = await createLifecycle(features, hooks)
  /** @type {Map<string, {document: import("../../core/document/index.js").HtmlDocument, before: string}>} */
  const htmlDocuments = new Map()
  for (const file of files) {
    await lifecycle.emitter.emit(file)
    if (!file.fileName.endsWith(".html") || typeof file.content !== "string") {
      continue
    }
    const document = getDocument(
      lifecycle,
      hooks,
      file.fileName,
      createNodeId("page", "vite-output", file.fileName),
      file.content,
    )
    htmlDocuments.set(file.fileName, {
      document,
      before: document.serialize(),
    })
  }
  await run(lifecycle, ["compose"], hooks.onTrace)
  for (const file of files) {
    const state = htmlDocuments.get(file.fileName)
    if (!state || typeof file.content !== "string") continue
    const after = state.document.serialize()
    if (after !== state.before) {
      await lifecycle.emitter.replace({ ...file, content: after })
    }
  }
  await run(lifecycle, ["finalize"], hooks.onTrace)
  const outputs = await lifecycle.emitter.list()
  await commitLifecycle(lifecycle, hooks)
  return outputs
}
