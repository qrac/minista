// @ts-check

/** @typedef {import("vite").BuildEnvironment} BuildEnvironment */
/** @typedef {import("./environment-input.js").ViteEnvironmentInput} ViteEnvironmentInput */

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
}
