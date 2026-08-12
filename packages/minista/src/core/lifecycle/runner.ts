import type { ArtifactStore, Emitter } from "../artifacts/index.js"
import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { ProjectGraph } from "../graph/index.js"
import { BUILD_PHASES } from "../types.js"
import { scheduleFeatures } from "./scheduler.js"
import type {
  LifecycleResult,
  LifecycleRunOptions,
  MinistaFeature,
  PhaseTraceEvent,
} from "./types.js"

export interface LifecycleDependencies {
  readonly graph: ProjectGraph
  readonly diagnostics: DiagnosticCollector
  readonly artifacts: ArtifactStore
  readonly emitter: Emitter
}

export class LifecycleRunner {
  readonly #features: readonly MinistaFeature[]
  readonly #dependencies: LifecycleDependencies

  constructor(
    features: readonly MinistaFeature[],
    dependencies: LifecycleDependencies,
  ) {
    this.#features = features
    this.#dependencies = dependencies
  }

  async run(options: LifecycleRunOptions = {}): Promise<LifecycleResult> {
    const traces: PhaseTraceEvent[] = []
    const trace = (event: PhaseTraceEvent) => {
      const item = Object.freeze({ ...event })
      traces.push(item)
      options.onTrace?.(item)
    }
    const features = scheduleFeatures(
      this.#features,
      this.#dependencies.diagnostics,
    )
    if (this.#dependencies.diagnostics.hasErrors()) {
      return Object.freeze({ ok: false, traces: Object.freeze(traces) })
    }

    for (const phase of options.phases ?? BUILD_PHASES) {
      trace({ type: "phase:start", phase })
      for (const feature of features) {
        const hook = feature.hooks[phase]
        if (!hook) continue
        trace({ type: "feature:start", phase, feature: feature.id })
        try {
          await hook({
            phase,
            graph: this.#dependencies.graph,
            diagnostics: this.#dependencies.diagnostics,
            artifacts: this.#dependencies.artifacts,
            emitter: this.#dependencies.emitter,
            trace,
          })
        } catch (error) {
          this.#dependencies.diagnostics.error({
            code: phase === "render" ? "MINISTA_RENDER_FAILED" : "MINISTA_PHASE_FAILED",
            message: error instanceof Error ? error.message : String(error),
            phase,
            feature: feature.id,
          })
          return Object.freeze({ ok: false, traces: Object.freeze(traces) })
        }
        trace({ type: "feature:end", phase, feature: feature.id })
      }
      trace({ type: "phase:end", phase })
    }

    return Object.freeze({
      ok: !this.#dependencies.diagnostics.hasErrors(),
      traces: Object.freeze(traces),
    })
  }
}
