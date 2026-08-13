// @ts-check

import path from "node:path"
import { createRequire } from "node:module"

import { createBuilder } from "vite"

import { NodeProjectManifestWriter } from "../filesystem/project-manifest-writer.js"
import { NodeDiagnosticsWriter } from "../filesystem/diagnostics-writer.js"
import { createDiagnosticsReport } from "../../core/diagnostics/index.js"
import { createProjectManifest } from "../../core/manifest/index.js"
import { loadViteAppConfig } from "./app-config-loader.js"
import { getViteBuildSession } from "./build-session.js"
import { prepareViteClientEnvironment } from "./environment-preparation.js"
import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "./output-manifest.js"
import { ViteOutputTransaction } from "./output-transaction.js"

/** @typedef {import("vite").BuildEnvironment} BuildEnvironment */
/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteBuilder} ViteBuilder */
/** @typedef {import("./app-builder.js").ViteAppBuildOptions} ViteAppBuildOptions */

const require = createRequire(import.meta.url)
const { version: ministaVersion } = require("../../../package.json")

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
    const writesOutput = client.config.build.write !== false
    const transaction = writesOutput
      ? new ViteOutputTransaction({
          root: client.config.root,
          outDir: client.config.build.outDir,
          buildId: session?.buildId,
        })
      : undefined
    await transaction?.begin()

    let outputManifest
    try {
      const clientOutput = await builder.build(client)
      outputManifest = createViteOutputManifest(clientOutput, {
        environment: clientName,
        base: client.config.base,
      })
      if (transaction) {
        outputManifest = await reconcileViteOutputManifest(outputManifest, {
          outDir: transaction.outDir,
          base: client.config.base,
        })
      }
    } catch (error) {
      await transaction?.rollback()
      throw error
    }
    await transaction?.commit()

    const createdAt = new Date().toISOString()
    const diagnostics = session?.diagnostics?.snapshot() ?? Object.freeze([])
    const projectGraph = session?.state?.projectGraph
    if (writesOutput && projectGraph) {
      const projectManifest = createProjectManifest(projectGraph, {
        version: ministaVersion,
        createdAt,
        diagnostics: session?.diagnostics?.summary() ?? {
          errors: 0,
          warnings: 0,
          info: 0,
        },
      })
      await new NodeProjectManifestWriter().write(
        client.config.root,
        projectManifest,
      )
    }
    if (writesOutput) {
      await new NodeDiagnosticsWriter().write(
        client.config.root,
        createDiagnosticsReport({
          version: ministaVersion,
          command: "build",
          ...(session?.buildId ? { buildId: session.buildId } : {}),
          diagnostics,
          createdAt,
        }),
      )
    }

    return Object.freeze({
      schemaVersion: "1",
      status: "success",
      ...(session?.buildId ? { buildId: session.buildId } : {}),
      diagnostics,
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
