import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginSearch(config: ResolvedConfig): Plugin {
  let command: "build" | "serve"
  let activeSearch = false

  const output = path.join(config.sub.tempDir, "search.txt")

  return {
    name: "minista-vite-plugin:search",
    config(_, viteConfig) {
      command = viteConfig.command
    },
    async buildStart() {
      if (command === "build") {
        await fs.remove(output)
      }
    },
    async transform(code, id) {
      if (
        command === "serve" &&
        id.match(path.join(__dirname, "../shared/search.js"))
      ) {
        const importCode = `import { searchObj as data } from "virtual:minista-plugin-develop"`
        const replacedCode = code
          .replace(
            /const response = await fetch/,
            "//const response = await fetch"
          )
          .replace(
            /const data = await response/,
            "//const data = await response"
          )
        return {
          code: importCode + "\n\n" + replacedCode,
          map: null,
        }
      }

      if (
        command === "build" &&
        id.match(path.join(__dirname, "../shared/search.js"))
      ) {
        if (!activeSearch) {
          await fs.outputFile(output, "")
          activeSearch = true
        }

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
