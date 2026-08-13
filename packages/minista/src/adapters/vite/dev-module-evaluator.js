// @ts-check

import { isRunnableDevEnvironment } from "vite"

/** @typedef {import("vite").Environment} Environment */
/** @typedef {import("vite").RunnableDevEnvironment} RunnableDevEnvironment */
/** @typedef {import("vite").ViteDevServer} ViteDevServer */

export class ViteDevEnvironmentNotRunnableError extends Error {
  code = "MINISTA_VITE_DEV_ENVIRONMENT_NOT_RUNNABLE"

  /** @param {string} environmentName */
  constructor(environmentName) {
    super(`Vite dev environment ${environmentName} is not runnable.`)
    this.name = "ViteDevEnvironmentNotRunnableError"
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message: this.message,
      hint: "Configure the render environment as a RunnableDevEnvironment.",
      phase: "resolve",
    })
  }
}

export class ViteDevModuleEvaluator {
  #server
  #environment

  /**
   * @param {ViteDevServer} server
   * @param {string} [environmentName]
   * @param {(environment: Environment) => environment is RunnableDevEnvironment} [guard]
   */
  constructor(server, environmentName = "ssr", guard = isRunnableDevEnvironment) {
    const environment = server.environments[environmentName]
    if (!environment || !guard(environment)) {
      throw new ViteDevEnvironmentNotRunnableError(environmentName)
    }
    this.#server = server
    this.#environment = environment
  }

  /**
   * @template Exports
   * @param {string} moduleId
   * @returns {Promise<Exports>}
   */
  importModule(moduleId) {
    return /** @type {Promise<Exports>} */ (this.#environment.runner.import(moduleId))
  }

  /** @param {string} moduleId */
  invalidateModule(moduleId) {
    const module = this.#environment.moduleGraph.getModuleById(moduleId)
    if (!module) return false
    this.#environment.moduleGraph.invalidateModule(module)
    return true
  }

  /** @param {Error} error */
  fixStacktrace(error) {
    this.#server.ssrFixStacktrace(error)
    return error
  }
}
