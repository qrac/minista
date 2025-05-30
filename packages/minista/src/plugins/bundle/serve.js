/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"

import { getGlobImportCode } from "./utils/code.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getServeBase } from "../../shared/url.js"
import { mergeAlias } from "../../shared/vite.js"

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

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      base = getServeBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.resolve(tempDir, "glob")
      globFile = path.resolve(globDir, `${tempName}.js`)

      const code = getGlobImportCode(opts)
      await fs.promises.mkdir(globDir, { recursive: true })
      await fs.promises.writeFile(globFile, code, "utf8")

      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: aliasGlob,
              replacement: globFile,
            },
          ]),
        },
      }
    },
    transformIndexHtml(html) {
      const prefixBase = base.replace(/\/$/, "")
      const scriptTag = `<script type="module" src="${prefixBase}${aliasGlob}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
  }
}
