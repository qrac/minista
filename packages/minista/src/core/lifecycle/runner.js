// @ts-check

import { BUILD_PHASES } from "../types.js"
import { scheduleFeatures } from "./scheduler.js"

/** @typedef {import("./types.js").LifecycleRunOptions} LifecycleRunOptions */
/** @typedef {import("./types.js").LifecycleResult} LifecycleResult */
/** @typedef {import("./types.js").MinistaFeature} MinistaFeature */
/** @typedef {import("./types.js").PhaseTraceEvent} PhaseTraceEvent */
/** @typedef {import("./runner.js").LifecycleDependencies} LifecycleDependencies */

export class LifecycleRunner {
  /** @type {readonly MinistaFeature[]} */
  #features
  /** @type {LifecycleDependencies} */
  #dependencies
  /**
   * @param {readonly MinistaFeature[]} features
   * @param {LifecycleDependencies} dependencies
   */
  constructor(features, dependencies) {
    this.#features = features
    this.#dependencies = dependencies
  }
  /**
   * @param {LifecycleRunOptions} [options]
   * @returns {Promise<LifecycleResult>}
   */
  async run(options = {}) {
    /** @type {PhaseTraceEvent[]} */
    const traces = []
    /** @param {PhaseTraceEvent} event */
    const trace = (event) => {
      const item = Object.freeze({ ...event })
      traces.push(item)
      options.onTrace?.(item)
    }
    const features = scheduleFeatures(this.#features, this.#dependencies.diagnostics)
    if (this.#dependencies.diagnostics.hasErrors()) {
      return Object.freeze({ ok: false, traces: Object.freeze(traces) })
    }
    for (const phase of options.phases ?? BUILD_PHASES) {
      trace({ type: "phase:start", phase })
      for (const feature of features) {
        const hook = feature.hooks[phase]
        if (!hook)
          continue
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
        }
        catch (error) {
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
