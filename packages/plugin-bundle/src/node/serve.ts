import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getGlobImportCode } from "./code.js"

export function pluginBundleServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["bundle", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  return {
    name: pluginName,
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      if (viteCommand === "serve") {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${tempName}.js`)

        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          resolve: {
            alias: [
              {
                find: "/@minista-bundle-serve",
                replacement: globFile,
              },
            ],
          },
        } as UserConfig
      }
    },
    transformIndexHtml(html) {
      const scriptPath = `/@minista-bundle-serve`
      const scriptTag = `<script type="module" src="${scriptPath}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
  }
}
