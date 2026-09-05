// @ts-check

import path from "node:path"
import { createRequire } from "node:module"
import { NodeDiagnosticsWriter } from "../filesystem/diagnostics-writer.js"
import { NodeProjectManifestWriter } from "../filesystem/project-manifest-writer.js"
import { createDiagnosticsReport, DiagnosticCollector } from "../../core/diagnostics/index.js"
import { applyOutputClaims } from "../../core/graph/index.js"
import { createProjectManifest } from "../../core/manifest/index.js"
import { createViteOutputManifest, reconcileViteOutputManifest } from "./output-manifest.js"
import { collectViteOutputClaims } from "./output-claims.js"
import { ViteOutputTransaction } from "./output-transaction.js"
import { normalizeViteBuildError } from "./build-error.js"

const require = createRequire(import.meta.url)
const { version } = require("../../../package.json")

export class ViteApplicationContractError extends Error {
  /** @param {`MINISTA_${string}`} code @param {string} message */
  constructor(code, message) {
    super(message)
    this.code = code
    this.diagnostic = Object.freeze({ code, message, severity: /** @type {const} */ ("error"), phase: /** @type {const} */ ("resolve") })
  }
}

/** @param {DiagnosticCollector} diagnostics */
export function assertBuildDiagnostics(diagnostics) {
  if (!diagnostics.hasErrors()) return
  const error = new ViteApplicationContractError("MINISTA_BUILD_DIAGNOSTICS_FAILED", "Build stopped because error diagnostics were reported.")
  Reflect.set(error, "diagnostics", diagnostics.snapshot())
  throw error
}

/**
 * Own client output and metadata until every application operation succeeds.
 * Rollback covers caught failures, not process crashes or simultaneous builds.
 * @param {import("vite").BuildEnvironment} environment
 * @param {import("./build-session.js").ViteBuildSession | undefined} session
 * @param {() => Promise<import("./app-builder.js").ViteBuildOutput>} build
 */
export async function runViteClientBuild(environment, session, build) {
  const config = environment.config
  const collector = session?.diagnostics ?? new DiagnosticCollector()
  assertBuildDiagnostics(collector)
  const writes = config.build.write !== false
  if (writes) {
    const outputs = config.build.rolldownOptions?.output
    for (const output of Array.isArray(outputs) ? outputs : [outputs]) {
      if (!output) continue
      if (output.file || (output.dir && path.resolve(output.dir) !== path.resolve(config.root, config.build.outDir))) {
        throw new ViteApplicationContractError("MINISTA_OUTPUT_TRANSACTION_DIRECTORY_MISMATCH", "Client output must use build.outDir; a separate rolldownOptions.output.dir or output.file cannot be transacted.")
      }
    }
  }
  const transaction = writes ? new ViteOutputTransaction({
    root: config.root,
    outDir: config.build.outDir,
    emptyOutDir: config.build.emptyOutDir,
    buildId: session?.buildId,
    protectMetadata: true,
  }) : undefined
  try {
    await transaction?.begin()
    const output = await build()
    assertBuildDiagnostics(collector)
    let outputManifest = createViteOutputManifest(output, {
      environment: environment.name, base: config.base,
    })
    if (transaction) {
      outputManifest = await reconcileViteOutputManifest(outputManifest, {
        outDir: transaction.outDir, base: config.base,
      })
    }
    let graph = session?.state?.projectGraph
    if (graph) {
      const collected = await collectViteOutputClaims(environment.plugins ?? config.plugins, environment)
      graph = applyOutputClaims(graph, collected.claims, collected.features, outputManifest, collector)
    }
    assertBuildDiagnostics(collector)
    const createdAt = new Date().toISOString()
    if (writes && graph) {
      await new NodeProjectManifestWriter().write(config.root, createProjectManifest(graph, {
        version, createdAt, diagnostics: collector.summary(), outputManifest,
      }))
    }
    if (writes) {
      await new NodeDiagnosticsWriter().write(config.root, createDiagnosticsReport({
        version, command: "build", buildId: session?.buildId,
        diagnostics: collector.snapshot(), createdAt,
      }))
    }
    await transaction?.commit()
    if (transaction?.cleanupDiagnostic) collector.add(transaction.cleanupDiagnostic)
    return { output, outputManifest, diagnostics: collector.snapshot() }
  } catch (error) {
    try {
      await transaction?.rollback()
    } catch (rollbackError) {
      collector.error({
        code: "MINISTA_OUTPUT_TRANSACTION_ROLLBACK_FAILED",
        message: "Output rollback failed; preserve the private backup for recovery.",
        phase: "finalize",
      })
      // Keep both failures available to the caller without hiding the build error.
      if (error && typeof error === "object") Reflect.set(error, "rollbackError", rollbackError)
    }
    const normalized = normalizeViteBuildError(error, {
      environment: environment.name, root: config.root,
    })
    const diagnostic = Reflect.get(normalized, "diagnostic")
    if (diagnostic) collector.add(diagnostic)
    throw normalized
  }
}
