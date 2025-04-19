import fs from "node:fs"
import path from "node:path"

import { getGlobImportCode } from "./code.js"
import { getPluginName, getTempName } from "../utils/name.js"
import { getRootDir, getTempDir } from "../utils/path.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginBundleServe(opts) {
  const cwd = process.cwd()
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
      }
    },
    transformIndexHtml(html) {
      const scriptTag = `<script type="module" src="${aliasGlob}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
  }
}
