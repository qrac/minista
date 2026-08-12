import { spawn } from "cross-spawn"
import path from "node:path"
import { build } from "vite"

import { attachViteBuildSession } from "../../adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../core/artifacts/index.js"

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
 * @param {boolean} isRender
 * @param {ViteBuildSession} [session]
 */
export async function runProgrammaticBuild(args, isRender, session) {
  const root = readRoot(args)
  const configFile = readOption(args, "--config", "-c")
  const mode = readOption(args, "--mode", "-m")
  const base = readOption(args, "--base")
  const logLevel = readOption(args, "--logLevel")
  const clearScreenValue = readOption(args, "--clearScreen")

  const config = {
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
    build: { ssr: isRender },
  }
  await build(session ? attachViteBuildSession(config, session) : config)
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
      const session = { artifacts: new MemoryArtifactStore() }
      await runProgrammaticBuild(args, true, session)
      await runProgrammaticBuild(args, false, session)
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
