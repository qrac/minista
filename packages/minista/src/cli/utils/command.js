import path from "node:path"
import { randomUUID } from "node:crypto"
import { createRequire } from "node:module"

import { NodeDiagnosticsWriter } from "../../adapters/filesystem/diagnostics-writer.js"
import { NodeExternalBuildHandoff } from "../../adapters/filesystem/external-build-handoff.js"
import { NodeProjectManifestWriter } from "../../adapters/filesystem/project-manifest-writer.js"
import { ViteAppBuilderAdapter } from "../../adapters/vite/app-builder.js"
import { ViteAppConfigPluginMismatchError } from "../../adapters/vite/app-config-loader.js"
import {
  attachViteBuildSession,
  createViteBuildSession,
  disposeViteBuildSession,
} from "../../adapters/vite/build-session.js"
import { LegacyViteBuilderAdapter } from "../../adapters/vite/legacy-builder.js"
import { ViteDevServerAdapter } from "../../adapters/vite/dev-server.js"
import { ViteCliProcessAdapter } from "../../adapters/vite/cli-process.js"
import { createDiagnosticsReport } from "../../core/diagnostics/index.js"
import { reportCliDiagnostic } from "./diagnostic.js"

/** @typedef {import("../../adapters/vite/build-session.js").ViteBuildSession} ViteBuildSession */

const require = createRequire(import.meta.url)
const { version: ministaVersion } = require("../../../package.json")

const viteCli = new ViteCliProcessAdapter()

/** @param {string[]} args @param {string} buildId */
async function promoteExternalBuildMetadata(args, buildId) {
  const root = createProgrammaticConfig(args).root || process.cwd()
  const handoff = new NodeExternalBuildHandoff()
  const manifest = await handoff.read(root, buildId)
  const createdAt = new Date().toISOString()
  if (manifest) {
    await new NodeProjectManifestWriter().write(root, manifest)
  }
  await new NodeDiagnosticsWriter().write(
    root,
    createDiagnosticsReport({
      version: ministaVersion,
      command: "build",
      buildId,
      diagnostics: [],
      createdAt,
    }),
  )
}

const supportedBuildFlags = new Set([
  "--config",
  "-c",
  "--mode",
  "-m",
  "--base",
  "--logLevel",
  "--clearScreen",
])
const requiredDevValueFlags = new Set([
  "--config",
  "-c",
  "--mode",
  "-m",
  "--base",
  "--port",
  "--logLevel",
])
const optionalDevValueFlags = new Set(["--host", "--open"])
const booleanDevFlags = new Set([
  "--cors",
  "--strictPort",
  "--force",
  "--clearScreen",
])

/**
 * @param {string[]} args
 * @returns {boolean}
 */
export function canRunProgrammaticBuild(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg?.startsWith("-")) continue
    const [flag] = arg.split("=", 1)
    if (!supportedBuildFlags.has(flag)) return false
    if (!arg.includes("=") && flag !== "--clearScreen") index += 1
  }
  return true
}

/** @param {string[]} args */
export function isDevCommand(args) {
  if (args.some((arg) => ["--version", "-v", "--help", "-h"].includes(arg))) {
    return false
  }
  const first = args[0]
  return !first || first === "dev" || first.startsWith("-") ||
    !["build", "preview", "optimize"].includes(first)
}

/** @param {string[]} args */
export function canRunProgrammaticDev(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg?.startsWith("-")) continue
    const [flag] = arg.split("=", 1)
    if (requiredDevValueFlags.has(flag)) {
      if (!arg.includes("=")) index += 1
      continue
    }
    if (optionalDevValueFlags.has(flag)) {
      if (!arg.includes("=") && args[index + 1] && !args[index + 1].startsWith("-")) {
        index += 1
      }
      continue
    }
    if (booleanDevFlags.has(flag)) {
      if (!arg.includes("=") && ["true", "false"].includes(args[index + 1])) {
        index += 1
      }
      continue
    }
    return false
  }
  return true
}

/**
 * @param {string[]} args
 * @param {string} long
 * @param {string} [short]
 * @returns {string|undefined}
 */
function readOption(args, long, short) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === long || (short && arg === short)) return args[index + 1]
    if (arg?.startsWith(`${long}=`)) return arg.slice(long.length + 1)
    if (short && arg?.startsWith(`${short}=`)) return arg.slice(short.length + 1)
  }
}

/**
 * @param {string[]} args
 * @returns {string}
 */
function readRoot(args) {
  const buildIndex = args.indexOf("build")
  const candidate = args[buildIndex + 1]
  return candidate && !candidate.startsWith("-") ? candidate : ""
}

/** @param {string[]} args */
function readDevRoot(args) {
  const candidate = args[0] === "dev" ? args[1] : args[0]
  return candidate && !candidate.startsWith("-") ? candidate : ""
}

/**
 * @param {string[]} args
 * @param {string} name
 * @returns {string | boolean | undefined}
 */
function readOptionalOption(args, name) {
  const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`))
  if (index < 0) return undefined
  const arg = args[index]
  if (arg.includes("=")) return arg.slice(name.length + 1) || true
  const next = args[index + 1]
  return next && !next.startsWith("-") ? next : true
}

/** @param {string[]} args @param {string} name */
function readBooleanOption(args, name) {
  const value = readOptionalOption(args, name)
  return value === undefined ? undefined : value !== "false"
}

/**
 * @param {string[]} args
 * @param {boolean} [isRender]
 * @returns {import("vite").InlineConfig}
 */
function createProgrammaticConfig(args, isRender) {
  const root = readRoot(args)
  const configFile = readOption(args, "--config", "-c")
  const mode = readOption(args, "--mode", "-m")
  const base = readOption(args, "--base")
  const logLevel = readOption(args, "--logLevel")
  const clearScreenValue = readOption(args, "--clearScreen")

  return {
    root: root ? path.resolve(process.cwd(), root) : process.cwd(),
    configFile: configFile ? path.resolve(process.cwd(), configFile) : undefined,
    mode,
    base,
    logLevel: ["info", "warn", "error", "silent"].includes(logLevel || "")
      ? /** @type {import("vite").LogLevel} */ (logLevel)
      : undefined,
    clearScreen:
      clearScreenValue === undefined
        ? undefined
        : clearScreenValue !== "false",
    ...(isRender === undefined ? {} : { build: { ssr: isRender } }),
  }
}

/** @param {string[]} args @returns {import("vite").InlineConfig} */
function createProgrammaticDevConfig(args) {
  const root = readDevRoot(args)
  const configFile = readOption(args, "--config", "-c")
  const mode = readOption(args, "--mode", "-m")
  const base = readOption(args, "--base")
  const logLevel = readOption(args, "--logLevel")
  const portValue = readOption(args, "--port")
  const host = readOptionalOption(args, "--host")
  const open = readOptionalOption(args, "--open")
  const cors = readBooleanOption(args, "--cors")
  const strictPort = readBooleanOption(args, "--strictPort")
  const force = readBooleanOption(args, "--force")
  const clearScreen = readBooleanOption(args, "--clearScreen")

  return {
    root: root ? path.resolve(process.cwd(), root) : process.cwd(),
    configFile: configFile ? path.resolve(process.cwd(), configFile) : undefined,
    mode,
    base,
    logLevel: ["info", "warn", "error", "silent"].includes(logLevel || "")
      ? /** @type {import("vite").LogLevel} */ (logLevel)
      : undefined,
    clearScreen,
    server: {
      ...(host !== undefined ? { host } : {}),
      ...(portValue !== undefined ? { port: Number(portValue) } : {}),
      ...(open !== undefined ? { open } : {}),
      ...(cors !== undefined ? { cors } : {}),
      ...(strictPort !== undefined ? { strictPort } : {}),
    },
    ...(force !== undefined ? { optimizeDeps: { force } } : {}),
  }
}

/** @param {string[]} args */
export async function runProgrammaticDev(args) {
  const running = await new ViteDevServerAdapter().start(
    createProgrammaticDevConfig(args),
  )
  const shutdown = () => {
    process.off("SIGINT", shutdown)
    process.off("SIGTERM", shutdown)
    void running.close().catch((error) => console.error(error))
  }
  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
  return running
}

/**
 * @param {string[]} args
 * @param {boolean} isRender
 * @param {ViteBuildSession} [session]
 */
export async function runProgrammaticBuild(args, isRender, session) {
  const config = createProgrammaticConfig(args, isRender)
  await new LegacyViteBuilderAdapter().build(
    session ? attachViteBuildSession(config, session) : config,
  )
}

/**
 * @param {string[]} args
 * @param {ViteBuildSession} session
 */
export async function runProgrammaticAppBuild(args, session) {
  const config = attachViteBuildSession(createProgrammaticConfig(args), session)
  return new ViteAppBuilderAdapter().build(config)
}

/** @param {ViteAppConfigPluginMismatchError} error */
function reportAppBuildFallback(error) {
  reportCliDiagnostic(error.diagnostic)
}

/**
 * @param {string[]} args
 * @param {import("../../core/diagnostics/index.js").Diagnostic} [fallbackDiagnostic]
 */
async function runLegacyBuildLifecycle(args, fallbackDiagnostic) {
  const session = createViteBuildSession()
  try {
    if (fallbackDiagnostic) session.diagnostics.add(fallbackDiagnostic)
    await runProgrammaticBuild(args, true, session)
    await runProgrammaticBuild(args, false, session)
  } finally {
    await disposeViteBuildSession(session)
  }
}

/**
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function runMinista(args) {
  const isBuild = args.includes("build")

  try {
    if (!isBuild && isDevCommand(args) && canRunProgrammaticDev(args)) {
      await runProgrammaticDev(args)
      return
    }
    if (isBuild && canRunProgrammaticBuild(args)) {
      const session = createViteBuildSession()
      let useLegacyFallback = false
      /** @type {import("../../core/diagnostics/index.js").Diagnostic | undefined} */
      let fallbackDiagnostic
      try {
        await runProgrammaticAppBuild(args, session)
      } catch (error) {
        if (!(error instanceof ViteAppConfigPluginMismatchError)) throw error
        reportAppBuildFallback(error)
        useLegacyFallback = true
        fallbackDiagnostic = error.diagnostic
      } finally {
        await disposeViteBuildSession(session)
      }
      if (useLegacyFallback) {
        await runLegacyBuildLifecycle(args, fallbackDiagnostic)
      }
      return
    }
    if (isBuild) {
      const buildId = randomUUID()
      const environment = { MINISTA_EXTERNAL_BUILD_ID: buildId }
      const root = createProgrammaticConfig(args).root || process.cwd()
      const handoff = new NodeExternalBuildHandoff()
      try {
        await viteCli.run([...args, "--ssr"], {
          environment: "render",
          phase: "bundle",
          variables: environment,
        })
        await viteCli.run(args, {
          environment: "client",
          phase: "bundle",
          variables: environment,
        })
        await promoteExternalBuildMetadata(args, buildId)
      } catch (error) {
        const diagnostic = error && typeof error === "object"
          ? Reflect.get(error, "diagnostic")
          : undefined
        if (diagnostic) {
          await new NodeDiagnosticsWriter().write(
            root,
            createDiagnosticsReport({
              version: ministaVersion,
              command: "build",
              buildId,
              diagnostics: [diagnostic],
              createdAt: new Date().toISOString(),
            }),
          )
        }
        throw error
      } finally {
        await handoff.clear(root, buildId)
      }
      return
    }
    await viteCli.run(args)
  } catch (error) {
    const diagnostic = error && typeof error === "object"
      ? Reflect.get(error, "diagnostic")
      : undefined
    if (diagnostic) reportCliDiagnostic(diagnostic)
    else console.error(error)
    process.exit(1)
  }
}
