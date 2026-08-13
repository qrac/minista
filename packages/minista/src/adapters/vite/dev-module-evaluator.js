// @ts-check

import { isRunnableDevEnvironment } from "vite"

import { getViteErrorLocation } from "./error-location.js"

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

export class ViteDevModuleError extends Error {
  code = "MINISTA_VITE_DEV_MODULE_FAILED"

  /**
   * @param {unknown} cause
   * @param {{environment: string, moduleId: string, root: string}} options
   */
  constructor(cause, options) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const message = `Vite dev module evaluation failed in ${options.environment}: ${detail}`
    const location = getViteErrorLocation(cause, options.root)
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "ViteDevModuleError"
    this.environment = options.environment
    this.moduleId = options.moduleId
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      phase: "resolve",
      ...(location ? { location } : {}),
      hint: "Fix the imported module or one of its dependencies.",
    })
  }
}

export class ViteDevModuleEvaluator {
  #server
  #environment
  #environmentName

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
    this.#environmentName = environmentName
  }

  /**
   * @template Exports
   * @param {string} moduleId
   * @returns {Promise<Exports>}
   */
  async importModule(moduleId) {
    try {
      return /** @type {Exports} */ (
        await this.#environment.runner.import(moduleId)
      )
    } catch (error) {
      if (
        error instanceof Error &&
        typeof Reflect.get(error, "code") === "string" &&
        Reflect.get(error, "code").startsWith("MINISTA_")
      ) {
        throw error
      }
      if (error instanceof Error) this.#server.ssrFixStacktrace(error)
      throw new ViteDevModuleError(error, {
        environment: this.#environmentName,
        moduleId,
        root: this.#server.config?.root ?? process.cwd(),
      })
    }
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
