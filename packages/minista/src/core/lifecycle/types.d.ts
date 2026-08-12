import type { ArtifactStore, Emitter } from "../artifacts/index.js"
import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { FeatureId, ProjectGraph } from "../graph/index.js"
import type { Awaitable, BuildPhase, Capability } from "../types.js"
export interface PhaseTraceEvent {
  readonly type: "phase:start" | "phase:end" | "feature:start" | "feature:end"
  readonly phase: BuildPhase
  readonly feature?: FeatureId
}
export interface PhaseContext {
  readonly phase: BuildPhase
  readonly graph: ProjectGraph
  readonly diagnostics: DiagnosticCollector
  readonly artifacts: ArtifactStore
  readonly emitter: Emitter
  trace(event: PhaseTraceEvent): void
}
export type FeatureHook = (context: PhaseContext) => Awaitable<void>
export type FeatureHooks = Partial<Record<BuildPhase, FeatureHook>>
export interface MinistaFeature<Options = unknown> {
  readonly id: FeatureId
  readonly apiVersion: 1
  readonly options: Readonly<Options>
  readonly requires?: readonly Capability[]
  readonly provides?: readonly Capability[]
  readonly after?: readonly FeatureId[]
  readonly hooks: FeatureHooks
}
export interface LifecycleRunOptions {
  readonly phases?: readonly BuildPhase[]
  onTrace?(event: PhaseTraceEvent): void
}
export interface LifecycleResult {
  readonly ok: boolean
  readonly traces: readonly PhaseTraceEvent[]
}
