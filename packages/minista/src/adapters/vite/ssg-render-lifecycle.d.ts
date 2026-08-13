import type { ArtifactStore } from "../../core/artifacts/index.js"
import type { Diagnostic, DiagnosticCollector } from "../../core/diagnostics/index.js"
import type { ProjectGraphSnapshot } from "../../core/graph/index.js"
import type { RenderedPage, SsgPageRenderer } from "../../features/ssg/index.js"

export declare class ViteSsgRenderLifecycleError extends Error {
  readonly code: "MINISTA_VITE_SSG_RENDER_FAILED"
  readonly diagnostics: readonly Diagnostic[]
  constructor(diagnostics: readonly Diagnostic[])
}
export declare function renderViteSsgPages(
  snapshot: ProjectGraphSnapshot,
  renderer: SsgPageRenderer,
  options?: {
    readonly artifacts?: ArtifactStore
    readonly diagnostics?: DiagnosticCollector
  },
): Promise<{
  readonly graph: ProjectGraphSnapshot
  readonly pages: readonly RenderedPage[]
}>
