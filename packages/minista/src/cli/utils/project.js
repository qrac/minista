import path from "node:path"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { createServer } from "vite"
import { glob } from "tinyglobby"

import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { NodeProjectManifestReader } from "../../adapters/filesystem/project-manifest-reader.js"
import {
  createCommandResult,
  createNodeId,
  DiagnosticCollector,
  inspectProjectManifest,
  toProjectPath,
} from "../../core/index.js"

/** @typedef {"check"|"inspect"|"explain"} ProjectCommand */
/** @typedef {{command: ProjectCommand, target: string, root: string, json: boolean, manifest: boolean}} ParsedProjectCommand */
/** @typedef {{id: string, apiVersion: 1, options: {src: string[], srcBases: string[]}, provides: string[], requires: string[]}} FeatureMetadata */
/** @typedef {import("vite").Plugin & {api?: {minista?: {feature?: FeatureMetadata}}}} MinistaVitePlugin */
/** @typedef {{code: string, severity: "error"|"warning"|"info", message: string, hint?: string}} ProjectDiagnostic */
/** @typedef {{command: ProjectCommand, ok: boolean, data: {summary?: string, relatedNodeIds?: readonly string[], counts?: Readonly<Record<string, number>>}, diagnostics: readonly ProjectDiagnostic[]}} ProjectCommandResult */

const serviceFile = fileURLToPath(
  new URL("../../adapters/vite/project-service.js", import.meta.url),
)

const projectCommands = new Set(["check", "inspect", "explain"])

/** @param {string | undefined} command */
export function isProjectCommand(command) {
  return Boolean(command && projectCommands.has(command))
}

/**
 * @param {string[]} args
 * @returns {ParsedProjectCommand | null}
 */
export function parseProjectCommandArgs(args) {
  const command = args[0]
  if (!isProjectCommand(command)) return null

  const positional = args.slice(1).filter((arg) => !arg.startsWith("-"))
  if (command === "explain") {
    return {
      command: /** @type {ProjectCommand} */ (command),
      target: positional[0] || "",
      root: positional[1] || "",
      json: args.includes("--json"),
      manifest: false,
    }
  }
  return {
    command: /** @type {ProjectCommand} */ (command),
    target: "",
    root: positional[0] || "",
    json: args.includes("--json"),
    manifest: command === "inspect" && args.includes("--manifest"),
  }
}

/**
 * @param {MinistaVitePlugin[]} plugins
 * @returns {{src: string[], srcBases: string[]}}
 */
function getSsgOptions(plugins) {
  const feature = plugins
    .map((plugin) => plugin?.api?.minista?.feature)
    .find((item) => item?.id === "ssg")
  return feature?.options ?? {
    src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
    srcBases: ["/src/pages"],
  }
}

/** @param {ProjectCommandResult} result */
function printHumanResult(result) {
  const data = result.data
  if (result.command === "explain") {
    console.log(data.summary)
    const relatedNodeIds = data.relatedNodeIds ?? []
    if (relatedNodeIds.length > 0) {
      console.log(`Related: ${relatedNodeIds.join(", ")}`)
    }
  } else {
    const counts = data.counts
    console.log(
      `minista ${result.command}: ${counts?.routes ?? 0} routes, ${counts?.pages ?? 0} pages, ${result.diagnostics.length} diagnostics`,
    )
  }
  for (const diagnostic of result.diagnostics) {
    const stream = diagnostic.severity === "error" ? console.error : console.warn
    stream(`[${diagnostic.code}] ${diagnostic.message}`)
    if (diagnostic.hint) stream(`  hint: ${diagnostic.hint}`)
  }
}

/**
 * @param {ProjectCommandResult} result
 * @param {boolean} json
 */
function printProjectResult(result, json) {
  if (json) console.log(JSON.stringify(result, null, 2))
  else printHumanResult(result)
  if (!result.ok) process.exitCode = 1
}

/** @param {string} rootDir */
async function inspectManifest(rootDir) {
  const diagnostics = new DiagnosticCollector()
  let inspection
  try {
    const manifest = await new NodeProjectManifestReader().read(rootDir)
    inspection = inspectProjectManifest(manifest)
  } catch (error) {
    const errorCode = error && typeof error === "object"
      ? Reflect.get(error, "code")
      : undefined
    const code = typeof errorCode === "string" &&
      errorCode.startsWith("MINISTA_")
      ? /** @type {`MINISTA_${string}`} */ (errorCode)
      : /** @type {const} */ ("MINISTA_MANIFEST_READ_FAILED")
    diagnostics.error({
      code,
      message: error instanceof Error ? error.message : String(error),
      hint: code === "MINISTA_MANIFEST_NOT_FOUND"
        ? "Run minista build before inspecting the manifest."
        : "Regenerate the manifest with the current minista version.",
      location: { file: toProjectPath(".minista/manifest.json") },
      phase: "discover",
    })
    inspection = Object.freeze({
      schemaVersion: /** @type {const} */ ("1"),
      project: Object.freeze({
        id: createNodeId("project", path.basename(rootDir)),
        name: path.basename(rootDir),
      }),
      counts: Object.freeze({
        features: 0,
        routes: 0,
        pages: 0,
        assets: 0,
        islands: 0,
        images: 0,
        artifacts: 0,
      }),
      routes: Object.freeze([]),
    })
  }
  return createCommandResult("inspect", inspection, diagnostics)
}

/**
 * @param {ParsedProjectCommand} parsed
 * @param {string} [configFile]
 */
export async function runProjectCommand(parsed, configFile) {
  const rootDir = path.resolve(process.cwd(), parsed.root || "")
  if (parsed.manifest) {
    printProjectResult(
      /** @type {ProjectCommandResult} */ (await inspectManifest(rootDir)),
      parsed.json,
    )
    return
  }
  const server = await createServer({
    root: rootDir,
    configFile: configFile || undefined,
    appType: "custom",
    server: { middlewareMode: true },
    logLevel: parsed.json ? "silent" : "error",
  })

  try {
    const options = getSsgOptions(
      /** @type {MinistaVitePlugin[]} */ (server.config.plugins),
    )
    const patterns = options.src.map((pattern) => pattern.replace(/^\/+/, ""))
    const sourceFiles = await glob(patterns, { cwd: rootDir })
    const evaluator = new ViteDevModuleEvaluator(server)
    /** @type {{analyzeProject(input: unknown): Promise<ProjectCommandResult>}} */
    const service = /** @type {{analyzeProject(input: unknown): Promise<ProjectCommandResult>}} */ (
      await evaluator.importModule(serviceFile)
    )
    const packageFile = path.resolve(rootDir, "package.json")
    let projectName = path.basename(rootDir)
    try {
      const packageJson = JSON.parse(await readFile(packageFile, "utf8"))
      projectName = packageJson.name || projectName
    } catch {}

    const result = await service.analyzeProject({
      command: parsed.command,
      projectName,
      sourceFiles,
      srcBases: options.srcBases,
      target: parsed.target,
      evaluator,
    })

    printProjectResult(result, parsed.json)
  } finally {
    await server.close()
  }
}
