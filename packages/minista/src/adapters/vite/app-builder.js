// @ts-check

import { createBuilder } from "vite"
import { planViteFeatureLifecycle } from "./feature-lifecycle.js"
import { loadViteAppConfig } from "./app-config-loader.js"
import { getViteBuildSession } from "./build-session.js"
import { prepareViteClientEnvironment } from "./environment-preparation.js"
import { normalizeViteBuildError } from "./build-error.js"
import { runViteClientBuild, ViteApplicationContractError, assertBuildDiagnostics } from "./client-build.js"

/** @typedef {import("vite").BuildEnvironment} BuildEnvironment */
/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteBuilder} ViteBuilder */
/** @typedef {import("./app-builder.js").ViteAppBuildOptions} ViteAppBuildOptions */

export class ViteAppEnvironmentNotFoundError extends Error {
  code = "MINISTA_VITE_APP_ENVIRONMENT_NOT_FOUND"

  /** @param {string} environmentName */
  constructor(environmentName) {
    super(`Vite App Build environment ${environmentName} was not configured.`)
    this.name = "ViteAppEnvironmentNotFoundError"
  }
}

export class ViteAppBuilderAdapter {
  #createBuilder
  /** @param {(config: InlineConfig, useLegacyBuilder: false) => Promise<ViteBuilder>} [factory] */
  constructor(factory = createBuilder) { this.#createBuilder = factory }

  /** @param {InlineConfig} config @param {ViteAppBuildOptions} [options] */
  async build(config, options = {}) {
    const session = getViteBuildSession(config)
    if (session?.diagnostics) assertBuildDiagnostics(session.diagnostics)
    const renderName = options.renderName ?? "render"
    const clientName = options.clientName ?? "client"
    if (renderName === clientName) {
      throw new ViteApplicationContractError("MINISTA_VITE_APP_ENVIRONMENT_CONFLICT", "Render and client environment names must differ.")
    }
    let appConfig
    let builder
    /** @type {import("./app-builder.js").ViteBuildOutput | undefined} */
    let clientOutput
    let orchestrated = false
    let building = false
    /** @param {ViteBuilder} current */
    const buildApp = async (current) => {
      if (orchestrated) throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_REPEATED", "Minista application build can only run once per builder.")
      orchestrated = true
      const render = this.#environment(current, renderName)
      const client = this.#environment(current, clientName)
      /** @param {BuildEnvironment} environment */
      const buildEnvironment = async (environment) => {
        building = true
        try {
          return await current.build(environment)
        } catch (error) {
          throw normalizeViteBuildError(error, {
            environment: environment.name, root: environment.config?.root ?? config.root ?? process.cwd(),
          })
        } finally { building = false }
      }
      const renderOutput = await buildEnvironment(render)
      if (session?.diagnostics) assertBuildDiagnostics(session.diagnostics)
      try {
        const preparation = { builder: current, render, client, renderOutput }
        await prepareViteClientEnvironment(preparation)
        await options.prepareClient?.(preparation)
      } catch (error) {
        throw normalizeViteBuildError(error, {
          environment: clientName, root: client.config.root ?? config.root ?? process.cwd(), phase: "generate",
        })
      }
      if (session?.diagnostics) assertBuildDiagnostics(session.diagnostics)
      clientOutput = await buildEnvironment(client)
    }
    try {
      appConfig = await loadViteAppConfig(config, { renderName, clientName })
      if (appConfig.builder?.buildApp) throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_RESERVED", "Minista owns builder.buildApp. Use plugin buildApp hooks for application setup and post-processing.")
      appConfig.builder = { ...appConfig.builder, buildApp }
      builder = await this.#createBuilder(appConfig, false)
      if (builder.config.builder?.buildApp !== buildApp) {
        throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_RESERVED", "A config plugin replaced Minista's builder.buildApp callback.")
      }
      const additional = Object.keys(builder.environments).filter((name) => name !== renderName && name !== clientName)
      // Vite may supply an unused default ssr environment; it is not an output target.
      if (additional.some((name) => name !== "ssr")) {
        throw new ViteApplicationContractError("MINISTA_VITE_APP_ENVIRONMENT_UNSUPPORTED", "Additional build environments are not supported by Minista's output transaction.")
      }
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: "application", root: config.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    this.#environment(builder, renderName)
    const client = this.#environment(builder, clientName)
    planViteFeatureLifecycle(client.plugins ?? [])
    const originalBuild = builder.build.bind(builder)
    // Application hooks may inspect the builder, but only Minista may start its
    // reserved environments, including during pre/post application hooks.
    builder.build = async (environment) => {
      if (!building) throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_RESERVED", "Application hooks cannot build Minista environments directly.")
      return originalBuild(environment)
    }
    const result = await runViteClientBuild(client, session, async () => {
      await builder.buildApp()
      if (!orchestrated || !clientOutput) {
        throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_INCOMPLETE", "Vite did not complete Minista's application build.")
      }
      return clientOutput
    })
    return Object.freeze({
      schemaVersion: /** @type {const} */ ("1"),
      status: /** @type {const} */ ("success"),
      ...(session?.buildId ? { buildId: session.buildId } : {}),
      diagnostics: result.diagnostics,
      environments: Object.freeze({
        render: Object.freeze({ name: renderName, status: /** @type {const} */ ("built") }),
        client: Object.freeze({ name: clientName, status: /** @type {const} */ ("built") }),
      }),
      outputManifest: result.outputManifest,
    })
  }

  /** @param {ViteBuilder} builder @param {string} name @returns {BuildEnvironment} */
  #environment(builder, name) {
    const environment = builder.environments[name]
    if (!environment) throw new ViteAppEnvironmentNotFoundError(name)
    return environment
  }
}
