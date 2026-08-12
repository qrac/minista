import type { ArtifactStore, Emitter } from "../artifacts/index.js"
import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { ProjectGraph } from "../graph/index.js"
import type { LifecycleResult, LifecycleRunOptions, MinistaFeature } from "./types.js"
export interface LifecycleDependencies {
  readonly graph: ProjectGraph
  readonly diagnostics: DiagnosticCollector
  readonly artifacts: ArtifactStore
  readonly emitter: Emitter
}
export declare class LifecycleRunner {
  #private
  constructor(features: readonly MinistaFeature[], dependencies: LifecycleDependencies)
  run(options?: LifecycleRunOptions): Promise<LifecycleResult>
}
