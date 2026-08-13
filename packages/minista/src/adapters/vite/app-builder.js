// @ts-check

import path from "node:path"
import { createRequire } from "node:module"

import { createBuilder } from "vite"

import { NodeProjectManifestWriter } from "../filesystem/project-manifest-writer.js"
import { NodeDiagnosticsWriter } from "../filesystem/diagnostics-writer.js"
import { createDiagnosticsReport } from "../../core/diagnostics/index.js"
import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { applyOutputClaims } from "../../core/graph/index.js"
import { createProjectManifest } from "../../core/manifest/index.js"
import { loadViteAppConfig } from "./app-config-loader.js"
import { getViteBuildSession } from "./build-session.js"
import { prepareViteClientEnvironment } from "./environment-preparation.js"
import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "./output-manifest.js"
import { ViteOutputTransaction } from "./output-transaction.js"
import { collectViteOutputClaims } from "./output-claims.js"
import { normalizeViteBuildError } from "./build-error.js"

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
    let appConfig
    try {
      appConfig = await loadViteAppConfig(config, {
        renderName,
        clientName,
      })
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: "application",
        root: config.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    let builder
    try {
      builder = await this.#createBuilder(appConfig, false)
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: "application",
        root: appConfig.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    const render = this.#environment(builder, renderName)
    const client = this.#environment(builder, clientName)

    let renderOutput
    try {
      renderOutput = await builder.build(render)
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: renderName,
        root: render.config?.root ?? appConfig.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    const preparation = { builder, render, client, renderOutput }
    try {
      await prepareViteClientEnvironment(preparation)
      await options.prepareClient?.(preparation)
    } catch (error) {
      const normalized = normalizeViteBuildError(error, {
        environment: clientName,
        root: client.config.root ?? appConfig.root ?? process.cwd(),
        phase: "generate",
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
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
      const normalized = normalizeViteBuildError(error, {
        environment: clientName,
        root: client.config.root ?? appConfig.root ?? process.cwd(),
      })
      const diagnostic = Reflect.get(normalized, "diagnostic")
      if (diagnostic) session?.diagnostics?.add(diagnostic)
      throw normalized
    }
    await transaction?.commit()

    const createdAt = new Date().toISOString()
    const collector = session?.diagnostics ?? new DiagnosticCollector()
    let projectGraph = session?.state?.projectGraph
    if (projectGraph) {
      const collected = await collectViteOutputClaims(
        client.config.plugins,
        client,
      )
      projectGraph = applyOutputClaims(
        projectGraph,
        collected.claims,
        collected.features,
        outputManifest,
        collector,
      )
    }
    const diagnostics = collector.snapshot()
    if (writesOutput && projectGraph) {
      const projectManifest = createProjectManifest(projectGraph, {
        version: ministaVersion,
        createdAt,
        diagnostics: collector.summary(),
        outputManifest,
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
