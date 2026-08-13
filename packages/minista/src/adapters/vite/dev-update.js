// @ts-check

/** @typedef {import("vite").EnvironmentModuleNode} EnvironmentModuleNode */
/** @typedef {import("vite").ViteDevServer} ViteDevServer */

export class ViteDevEnvironmentMissingError extends Error {
  code = "MINISTA_VITE_DEV_ENVIRONMENT_MISSING"

  /** @param {string} environmentName */
  constructor(environmentName) {
    super(`Vite dev environment ${environmentName} is not available.`)
    this.name = "ViteDevEnvironmentMissingError"
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message: this.message,
      hint: "Configure the required Minista dev environment.",
      phase: "resolve",
    })
  }
}

export class ViteDevUpdateAdapter {
  #server

  /** @param {ViteDevServer} server */
  constructor(server) {
    this.#server = server
  }

  /** @param {string} environmentName */
  #environment(environmentName) {
    const environment = this.#server.environments[environmentName]
    if (!environment) throw new ViteDevEnvironmentMissingError(environmentName)
    return environment
  }

  /**
   * @param {string} environmentName
   * @param {{id?: string | null, file?: string | null}} reference
   */
  hasModule(environmentName, reference) {
    const graph = this.#environment(environmentName).moduleGraph
    if (reference.id && graph.getModuleById(reference.id)) return true
    const modules = reference.file
      ? graph.getModulesByFile(reference.file)
      : undefined
    return Boolean(modules && modules.size > 0)
  }

  /**
   * @param {string} environmentName
   * @param {string} moduleId
   * @param {number} timestamp
   * @param {boolean} [hardInvalidate]
   */
  invalidateModuleById(
    environmentName,
    moduleId,
    timestamp,
    hardInvalidate = false,
  ) {
    const graph = this.#environment(environmentName).moduleGraph
    const module = graph.getModuleById(moduleId)
    if (!module) return false
    graph.invalidateModule(module, new Set(), timestamp, hardInvalidate)
    return true
  }

  /**
   * @param {string} environmentName
   * @param {readonly EnvironmentModuleNode[]} modules
   * @param {number} timestamp
   * @param {boolean} [hardInvalidate]
   */
  invalidateModules(
    environmentName,
    modules,
    timestamp,
    hardInvalidate = false,
  ) {
    const graph = this.#environment(environmentName).moduleGraph
    /** @type {Set<EnvironmentModuleNode>} */
    const invalidated = new Set()
    for (const module of modules) {
      graph.invalidateModule(module, invalidated, timestamp, hardInvalidate)
    }
  }

  /** @param {string} [environmentName] */
  fullReload(environmentName = "client") {
    this.#environment(environmentName).hot.send({ type: "full-reload" })
  }
}
