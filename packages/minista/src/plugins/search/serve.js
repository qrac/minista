/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizePath } from "vite"

import { getSearchData } from "./utils/data.js"
import { getPluginName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getServeBase } from "../../shared/url.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSearchServe(opts) {
  const cwd = process.cwd()
  const names = ["search", "serve"]
  const pluginName = getPluginName(names)
  const cpSearchPath = normalizePath(
    path.resolve(__dirname, "components/search.js")
  )

  let base = "/"
  let rootDir = ""
  let tempDir = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      base = getServeBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/@__minista_search_json") {
          const mod = await server.ssrLoadModule("virtual:ssg-pages")
          /** @type {SsgPage[]} */
          const ssgPages = mod.default ?? mod
          const searchData = getSearchData(ssgPages, opts)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(searchData))
          return
        }
        next()
      })
    },
    transform(code, id) {
      if (![cpSearchPath].includes(id)) return

      let newCode = code

      const regBase = /(const base = )"\/"/
      const regInputAttr = /(const inputAttr = )"data-search-input"/

      newCode = newCode.replace(regBase, `$1"${base}"`)
      newCode = newCode.replace(regInputAttr, `$1"${opts.inputAttr}"`)
      return newCode
    },
  }
}
