import fs from "node:fs"
import path from "node:path"

const DEFAULT_CONFIG_FILES = [
  "minista.config.js",
  "minista.config.cjs",
  "minista.config.mjs",
  "minista.config.ts",
  "minista.config.cts",
  "minista.config.mts",
]

export function findConfigFile(cwd: string, rootArg?: string): string {
  let configFile = ""

  for (const fileName of DEFAULT_CONFIG_FILES) {
    const filePath = path.join(cwd, fileName)

    if (fs.existsSync(filePath)) {
      configFile = fileName
    }
  }
  if (rootArg) {
    for (const fileName of DEFAULT_CONFIG_FILES) {
      const filePath = path.join(cwd, rootArg, fileName)

      if (fs.existsSync(filePath)) {
        configFile = path.join(rootArg, fileName)
      }
    }
  }
  return configFile
}
