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

/** @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features */
function createLifecycle(features) {
  const diagnostics = new DiagnosticCollector()
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
  const documentStore = new MemoryHtmlDocumentStore()
  const artifacts = new MemoryArtifactStore()
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
  const lifecycle = createLifecycle(features)
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
    const document = documents.parse({ pageId, html: page.html })
    lifecycle.documents.put(document)
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
    graph: lifecycle.graph.snapshot(),
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
 */
export async function composeViteHtml(html, pageIdentity, features) {
  const lifecycle = createLifecycle(features)
  const document = documents.parse({
    pageId: createNodeId("page", "vite-compatibility", pageIdentity),
    html,
  })
  const before = document.serialize()
  lifecycle.documents.put(document)
  await run(lifecycle, ["compose"])
  const after = document.serialize()
  return after === before ? html : after
}

/**
 * @param {readonly import("../../core/artifacts/index.js").EmittedFile[]} files
 * @param {readonly import("../../core/lifecycle/index.js").MinistaFeature[]} features
 */
export async function processViteOutputs(files, features) {
  const lifecycle = createLifecycle(features)
  /** @type {Map<string, {document: import("../../core/document/index.js").HtmlDocument, before: string}>} */
  const htmlDocuments = new Map()
  for (const file of files) {
    await lifecycle.emitter.emit(file)
    if (!file.fileName.endsWith(".html") || typeof file.content !== "string") {
      continue
    }
    const document = documents.parse({
      pageId: createNodeId("page", "vite-output", file.fileName),
      html: file.content,
    })
    lifecycle.documents.put(document)
    htmlDocuments.set(file.fileName, {
      document,
      before: document.serialize(),
    })
  }
  await run(lifecycle, ["compose"])
  for (const file of files) {
    const state = htmlDocuments.get(file.fileName)
    if (!state || typeof file.content !== "string") continue
    const after = state.document.serialize()
    if (after !== state.before) {
      await lifecycle.emitter.replace({ ...file, content: after })
    }
  }
  await run(lifecycle, ["finalize"])
  return lifecycle.emitter.list()
}
