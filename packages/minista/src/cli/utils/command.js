import { spawn } from "cross-spawn"
import path from "node:path"

import { ViteAppBuilderAdapter } from "../../adapters/vite/app-builder.js"
import { ViteAppConfigPluginMismatchError } from "../../adapters/vite/app-config-loader.js"
import {
  attachViteBuildSession,
  createViteBuildSession,
  disposeViteBuildSession,
} from "../../adapters/vite/build-session.js"
import { LegacyViteBuilderAdapter } from "../../adapters/vite/legacy-builder.js"
import { reportCliDiagnostic } from "./diagnostic.js"

/** @typedef {import("../../adapters/vite/build-session.js").ViteBuildSession} ViteBuildSession */

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function runVite(args) {
  return new Promise((resolve, reject) => {
    const process = spawn("vite", args, { stdio: "inherit" })

    process.on("close", (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
  })
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

/** @param {string[]} args */
async function runLegacyBuildLifecycle(args) {
  const session = createViteBuildSession()
  try {
    await runProgrammaticBuild(args, true, session)
    await runProgrammaticBuild(args, false, session)
  } finally {
    await disposeViteBuildSession(session)
  }
}

/**
 * @param {string[]} args
 * @param {boolean} [isOneBuild]
 * @returns {Promise<void>}
 */
export async function runMinista(args, isOneBuild) {
  const isBuild = args.includes("build")

  try {
    if (isBuild && !isOneBuild && canRunProgrammaticBuild(args)) {
      const session = createViteBuildSession()
      let useLegacyFallback = false
      try {
        await runProgrammaticAppBuild(args, session)
      } catch (error) {
        if (!(error instanceof ViteAppConfigPluginMismatchError)) throw error
        reportAppBuildFallback(error)
        useLegacyFallback = true
      } finally {
        await disposeViteBuildSession(session)
      }
      if (useLegacyFallback) await runLegacyBuildLifecycle(args)
      return
    }
    if (isBuild && !isOneBuild) {
      await runVite([...args, "--ssr"])
    }
    await runVite(args)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
