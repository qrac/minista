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
  const aliasGlob = `/@${tempName}-glob`

  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
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
              find: aliasGlob,
              replacement: globFile,
            },
          ],
        },
      } as UserConfig
    },
    transformIndexHtml(html) {
      const scriptTag = `<script type="module" src="${aliasGlob}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
  }
}
