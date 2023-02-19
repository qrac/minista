import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginSearch(config: ResolvedConfig): Plugin {
  let command: "build" | "serve"

  const tempFileName = "__minista_plugin_search.json"
  const tempFind = path.join("/@minista-temp", tempFileName)
  const tempReplacement = path.join(config.sub.tempDir, tempFileName)

  return {
    name: "minista-vite-plugin:search",
    config: (_, viteConfig) => {
      command = viteConfig.command
      return {
        resolve: {
          alias: [
            {
              find: tempFind,
              replacement: tempReplacement,
            },
          ],
        },
      }
    },
    async buildStart() {
      if (command === "serve") {
        await fs.remove(tempReplacement)
      }
    },
    async transform(code, id) {
      if (
        command === "build" &&
        id.match(path.join(__dirname, "../shared/search.js"))
      ) {
        const { resolvedBase } = config.sub

        let filePath = path.join(
          config.main.search.outDir,
          config.main.search.outName + ".json"
        )
        filePath = resolvedBase.match(/^\/.*\/$/)
          ? path.join(resolvedBase, filePath)
          : path.join("/", filePath)

        const replacedCode = code.replace(
          /\/@minista-temp\/__minista_plugin_search\.json/,
          filePath
        )
        return {
          code: replacedCode,
          map: null,
        }
      }
    },
  }
}
