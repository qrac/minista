// @ts-check

import { createBuilder } from "vite"

import { getViteBuildSession } from "./build-session.js"
import { ViteOutputTransaction } from "./output-transaction.js"

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
    const session = getViteBuildSession(config)
    const writesClientOutput =
      config.build?.ssr === false && environment.config.build.write !== false
    const transaction = writesClientOutput
      ? new ViteOutputTransaction({
          root: environment.config.root,
          outDir: environment.config.build.outDir,
          buildId: session?.buildId,
        })
      : undefined
    await transaction?.begin()
    let result
    try {
      result = await builder.build(environment)
    } catch (error) {
      await transaction?.rollback()
      throw error
    }
    await transaction?.commit()
    return result
  }
}
