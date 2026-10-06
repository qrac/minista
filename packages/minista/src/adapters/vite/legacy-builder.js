// @ts-check

import { createBuilder } from "vite"
import { planViteFeatureLifecycle } from "./feature-lifecycle.js"
import { getViteBuildSession } from "./build-session.js"
import { normalizeViteBuildError } from "./build-error.js"
import { runViteClientBuild } from "./client-build.js"

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
    const session = getViteBuildSession(config)
    let builder
    try {
      builder = await this.#createBuilder(config, true)
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: config.build?.ssr ? "render" : "client",
        root: config.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    const environment = Object.values(builder.environments)[0]
    if (!environment) throw new ViteEnvironmentNotFoundError()
    planViteFeatureLifecycle(environment.plugins ?? [])
    const writesClientOutput =
      config.build?.ssr === false && environment.config.build.write !== false
    if (writesClientOutput) {
      const result = await runViteClientBuild(environment, session, () => builder.build(environment))
      return result.output
    }
    try {
      return await builder.build(environment)
    } catch (error) {
      throw normalizeViteBuildError(error, {
        environment: environment.name, root: environment.config.root ?? config.root ?? process.cwd(),
      })
    }
  }
}
