// @ts-check

/** @typedef {import("vite").BuildEnvironment} BuildEnvironment */
/** @typedef {import("./environment-input.js").ViteEnvironmentInput} ViteEnvironmentInput */
/** @typedef {import("./environment-input.js").ViteNamedEnvironmentInput} ViteNamedEnvironmentInput */

export class ViteEnvironmentInputMergeError extends Error {
  code = "MINISTA_VITE_INPUT_NOT_NAMED"

  constructor() {
    super("Vite environment input must be a named entry record before merging.")
    this.name = "ViteEnvironmentInputMergeError"
  }
}

export class ViteEnvironmentInputAdapter {
  /**
   * Apply a late-resolved input plan before the environment build starts.
   * Vite's resolved environment config is intentionally contained here.
   *
   * @param {BuildEnvironment} environment
   * @param {ViteEnvironmentInput} input
   */
  apply(environment, input) {
    environment.config.build.rolldownOptions = {
      ...environment.config.build.rolldownOptions,
      input,
    }
  }

  /**
   * @param {BuildEnvironment} environment
   * @param {ViteNamedEnvironmentInput} entries
   */
  merge(environment, entries) {
    const current = environment.config.build.rolldownOptions.input
    if (
      current !== undefined &&
      (typeof current !== "object" || Array.isArray(current))
    ) {
      throw new ViteEnvironmentInputMergeError()
    }
    this.apply(environment, { ...current, ...entries })
  }
}
