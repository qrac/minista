import fs from "node:fs"
import path from "node:path"

/**
 * @param {string} [rootArg]
 * @returns {string}
 */
export function existsConfigFile(rootArg) {
  const cwd = process.cwd()
  const DEFAULT_CONFIG_FILES = [
    "minista.config.js",
    "minista.config.cjs",
    "minista.config.mjs",
    "minista.config.ts",
    "minista.config.cts",
    "minista.config.mts",
  ]
  if (rootArg) {
    for (const fileName of DEFAULT_CONFIG_FILES) {
      const filePath = path.join(cwd, rootArg, fileName)
      if (fs.existsSync(filePath)) {
        return path.join(rootArg, fileName)
      }
    }
  }
  for (const fileName of DEFAULT_CONFIG_FILES) {
    const filePath = path.join(cwd, fileName)
    if (fs.existsSync(filePath)) {
      return fileName
    }
  }
  return ""
}
