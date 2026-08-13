// @ts-check

import { MemoryArtifactStore, MemoryEmitter } from "../../core/artifacts/index.js"
import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { MemoryHtmlDocumentStore } from "../../core/document/index.js"
import { ProjectGraph } from "../../core/graph/index.js"
import { LifecycleRunner } from "../../core/lifecycle/index.js"
import {
  createRenderedPagesArtifactId,
  createSsgRenderFeature,
  parseRenderedPages,
} from "../../features/ssg/index.js"

export class ViteSsgRenderLifecycleError extends Error {
  code = "MINISTA_VITE_SSG_RENDER_FAILED"

  /** @param {readonly import("../../core/diagnostics/index.js").Diagnostic[]} diagnostics */
  constructor(diagnostics) {
    super(diagnostics.map(({ code, message }) => `[${code}] ${message}`).join("\n"))
    this.name = "ViteSsgRenderLifecycleError"
    this.diagnostics = diagnostics
  }
}

/**
 * @param {import("../../core/graph/index.js").ProjectGraphSnapshot} snapshot
 * @param {import("../../features/ssg/index.js").SsgPageRenderer} renderer
 * @param {{artifacts?: import("../../core/artifacts/index.js").ArtifactStore, diagnostics?: DiagnosticCollector, onTrace?: (event: import("../../core/lifecycle/index.js").PhaseTraceEvent) => void}} [options]
 */
export async function renderViteSsgPages(snapshot, renderer, options = {}) {
  const diagnostics = options.diagnostics ?? new DiagnosticCollector()
  const artifacts = options.artifacts ?? new MemoryArtifactStore()
  const graph = ProjectGraph.fromSnapshot(snapshot, diagnostics)
  const feature = createSsgRenderFeature(renderer)
  const result = await new LifecycleRunner([feature], {
    graph,
    diagnostics,
    documents: new MemoryHtmlDocumentStore(),
    artifacts,
    emitter: new MemoryEmitter(),
  }).run({ phases: ["render"], onTrace: options.onTrace })
  if (!result.ok) {
    throw new ViteSsgRenderLifecycleError(diagnostics.snapshot())
  }
  const record = await artifacts.get(createRenderedPagesArtifactId())
  if (!record) {
    diagnostics.error({
      code: "MINISTA_RENDER_FAILED",
      message: "SSG render lifecycle did not produce rendered pages.",
      phase: "render",
      feature: feature.id,
    })
    throw new ViteSsgRenderLifecycleError(diagnostics.snapshot())
  }
  return Object.freeze({
    graph: graph.snapshot(),
    pages: parseRenderedPages(JSON.parse(String(record.content))),
  })
}
