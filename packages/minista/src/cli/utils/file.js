import fs from "node:fs"
import path from "node:path"

/**
 * @param {string} [rootArg]
 * @returns {string}
 */
export function findConfigFile(rootArg) {
  const cwd = process.cwd()
  const configFileList = [
    "minista.config.js",
    "minista.config.cjs",
    "minista.config.mjs",
    "minista.config.ts",
    "minista.config.cts",
    "minista.config.mts",
  ]
  if (rootArg) {
    for (const fileName of configFileList) {
      const filePath = path.resolve(cwd, rootArg, fileName)
      if (fs.existsSync(filePath)) {
        return path.resolve(rootArg, fileName)
      }
    }
  }
  for (const fileName of configFileList) {
    const filePath = path.resolve(cwd, fileName)
    if (fs.existsSync(filePath)) {
      return fileName
    }
  }
  return ""
}
