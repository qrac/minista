// @ts-check

import path from "node:path"

import { createBuilder } from "vite"

import { loadViteAppConfig } from "./app-config-loader.js"
import { getViteBuildSession } from "./build-session.js"
import { prepareViteClientEnvironment } from "./environment-preparation.js"
import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "./output-manifest.js"

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

  /**
   * @param {(config: InlineConfig, useLegacyBuilder: false) => Promise<ViteBuilder>} [factory]
   */
  constructor(factory = createBuilder) {
    this.#createBuilder = factory
  }

  /**
   * @param {InlineConfig} config
   * @param {ViteAppBuildOptions} [options]
   */
  async build(config, options = {}) {
    const session = getViteBuildSession(config)
    const renderName = options.renderName ?? "render"
    const clientName = options.clientName ?? "client"
    const appConfig = await loadViteAppConfig(config, {
      renderName,
      clientName,
    })
    const builder = await this.#createBuilder(appConfig, false)
    const render = this.#environment(builder, renderName)
    const client = this.#environment(builder, clientName)

    const renderOutput = await builder.build(render)
    const preparation = { builder, render, client, renderOutput }
    await prepareViteClientEnvironment(preparation)
    await options.prepareClient?.(preparation)
    const clientOutput = await builder.build(client)
    let outputManifest = createViteOutputManifest(clientOutput, {
      environment: clientName,
      base: client.config.base,
    })
    if (client.config.build.write !== false) {
      outputManifest = await reconcileViteOutputManifest(outputManifest, {
        outDir: path.resolve(client.config.root, client.config.build.outDir),
        base: client.config.base,
      })
    }

    return Object.freeze({
      schemaVersion: "1",
      status: "success",
      ...(session?.buildId ? { buildId: session.buildId } : {}),
      diagnostics: session?.diagnostics?.snapshot() ?? Object.freeze([]),
      environments: Object.freeze({
        render: Object.freeze({ name: renderName, status: "built" }),
        client: Object.freeze({ name: clientName, status: "built" }),
      }),
      outputManifest,
    })
  }

  /**
   * @param {ViteBuilder} builder
   * @param {string} name
   * @returns {BuildEnvironment}
   */
  #environment(builder, name) {
    const environment = builder.environments[name]
    if (!environment) throw new ViteAppEnvironmentNotFoundError(name)
    return environment
  }
}
