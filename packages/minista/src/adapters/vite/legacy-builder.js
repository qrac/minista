// @ts-check

import { createBuilder } from "vite"
import { createRequire } from "node:module"

import { NodeDiagnosticsWriter } from "../filesystem/diagnostics-writer.js"
import { NodeProjectManifestWriter } from "../filesystem/project-manifest-writer.js"
import { createDiagnosticsReport } from "../../core/diagnostics/index.js"
import { createProjectManifest } from "../../core/manifest/index.js"
import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "./output-manifest.js"
import { getViteBuildSession } from "./build-session.js"
import { ViteOutputTransaction } from "./output-transaction.js"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteBuilder} ViteBuilder */

const require = createRequire(import.meta.url)
const { version: ministaVersion } = require("../../../package.json")

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
    let outputManifest
    try {
      result = await builder.build(environment)
      if (writesClientOutput) {
        outputManifest = createViteOutputManifest(result, {
          environment: environment.name,
          base: environment.config.base,
        })
        if (transaction) {
          outputManifest = await reconcileViteOutputManifest(outputManifest, {
            outDir: transaction.outDir,
            base: environment.config.base,
          })
        }
      }
    } catch (error) {
      await transaction?.rollback()
      throw error
    }
    await transaction?.commit()
    if (writesClientOutput) {
      const createdAt = new Date().toISOString()
      const diagnostics = session?.diagnostics?.snapshot() ?? Object.freeze([])
      const projectGraph = session?.state?.projectGraph
      if (projectGraph) {
        await new NodeProjectManifestWriter().write(
          environment.config.root,
          createProjectManifest(projectGraph, {
            version: ministaVersion,
            createdAt,
            diagnostics: session?.diagnostics?.summary() ?? {
              errors: 0,
              warnings: 0,
              info: 0,
            },
            ...(outputManifest ? { outputManifest } : {}),
          }),
        )
      }
      await new NodeDiagnosticsWriter().write(
        environment.config.root,
        createDiagnosticsReport({
          version: ministaVersion,
          command: "build",
          ...(session?.buildId ? { buildId: session.buildId } : {}),
          diagnostics,
          createdAt,
        }),
      )
    }
    return result
  }
}
