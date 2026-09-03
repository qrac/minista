import fs from "node:fs"
import path from "node:path"

import { createConfigConflictDiagnostic } from "./diagnostic.js"

const configFileNameList = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "vite.config.cjs",
  "vite.config.mts",
  "vite.config.cts",
  "minista.config.js",
  "minista.config.mjs",
  "minista.config.ts",
  "minista.config.cjs",
  "minista.config.mts",
  "minista.config.cts",
]

export class ConfigFileConflictError extends Error {
  /** @param {readonly string[]} configFiles */
  constructor(configFiles) {
    const diagnostic = createConfigConflictDiagnostic(configFiles)
    super(diagnostic.message)
    this.name = "ConfigFileConflictError"
    this.diagnostic = diagnostic
  }
}

/**
 * @param {string} [rootArg]
 * @returns {string}
 */
export function findConfigFile(rootArg) {
  const cwd = process.cwd()

  if (rootArg) {
    const configFiles = findConfigFiles(path.resolve(cwd, rootArg))
    if (configFiles.length) {
      return resolveConfigFile(configFiles, rootArg)
    }
  }

  const configFiles = findConfigFiles(cwd)
  if (configFiles.length) {
    return resolveConfigFile(configFiles)
  }

  return ""
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function findConfigFiles(root) {
  return configFileNameList.filter((fileName) =>
    fs.existsSync(path.resolve(root, fileName))
  )
}

/**
 * @param {string[]} configFiles
 * @param {string} [rootArg]
 * @returns {string}
 */
function resolveConfigFile(configFiles, rootArg) {
  if (configFiles.length > 1) {
    throw new ConfigFileConflictError(configFiles)
  }

  const configFile = configFiles[0]
  return rootArg ? path.resolve(rootArg, configFile) : configFile
}
