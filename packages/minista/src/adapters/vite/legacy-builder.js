// @ts-check

import { createBuilder } from "vite"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteBuilder} ViteBuilder */

export class ViteEnvironmentNotFoundError extends Error {
  code = "MINISTA_VITE_ENVIRONMENT_NOT_FOUND"

  constructor() {
    super("Vite did not create a build environment.")
    this.name = "ViteEnvironmentNotFoundError"
  }
}

export class LegacyViteBuilderAdapter {
  #createBuilder

  /**
   * @param {(config: InlineConfig, useLegacyBuilder: true) => Promise<ViteBuilder>} [factory]
   */
  constructor(factory = createBuilder) {
    this.#createBuilder = factory
  }

  /**
   * Build one backward-compatible Vite environment through the Builder API.
   * The caller owns render/client ordering and the shared Minista build session.
   *
   * @param {InlineConfig} config
   */
  async build(config) {
    const builder = await this.#createBuilder(config, true)
    const environment = Object.values(builder.environments)[0]
    if (!environment) throw new ViteEnvironmentNotFoundError()
    return builder.build(environment)
  }
}
