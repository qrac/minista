import fs from "node:fs"
import path from "node:path"
import pc from "picocolors"

import { getGlobImportCode } from "./code.js"
import { formatLayout, resolveLayout } from "./layout.js"
import { formatPages, resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

import { getPluginName, getTempName } from "../../utils/name.js"
import { getRootDir, getTempDir } from "../../utils/path.js"
import { mergeSsrExternal } from "../../utils/vite.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSsgServe(opts) {
  const cwd = process.cwd()
  const names = ["ssg", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

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

      return { ssr: { external: mergeSsrExternal(config, ["minista"]) } }
    },
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const base = server.config.base || "/"
            const originalUrl = req.originalUrl || ""
            const normalizedBase = base
              .replace(/\/+$/, "")
              .replace(/^([^/])/, "/$1")
            const url = originalUrl.startsWith(normalizedBase)
              ? originalUrl.slice(normalizedBase.length) || "/"
              : originalUrl
            const ssr = server.ssrLoadModule
            const { LAYOUTS = {}, PAGES = {} } = await ssr(globFile)
            const formatedLayout = formatLayout(LAYOUTS)
            const resolvedLayout = await resolveLayout(formatedLayout)
            const formatedPages = formatPages(PAGES, opts)
            const resolvedPages = await resolvePages(formatedPages)
            const resolvedPage = resolvedPages.find((page) => page.url === url)

            let html = ""

            if (resolvedPage) {
              html = transformHtml({ resolvedLayout, resolvedPage })
              html = await server.transformIndexHtml(originalUrl, html)
              res.statusCode = 200
              res.setHeader("Content-Type", "text/html")
              res.end(html)
            } else {
              next()
            }
          } catch (e) {
            server.ssrFixStacktrace(e)
            next(e)
          }
        })
      }
    },
    hotUpdate: {
      order: "post",
      handler({ modules, server, timestamp }) {
        if (this.environment.name !== "ssr") return

        let hasSsrOnly = false
        const invalidated = new Set()

        for (const mod of modules) {
          if (!mod.id) continue
          if (server.environments.client.moduleGraph.getModuleById(mod.id))
            continue

          this.environment.moduleGraph.invalidateModule(
            mod,
            invalidated,
            timestamp,
            true
          )
          hasSsrOnly = true
        }

        if (hasSsrOnly) {
          const rel = path
            .relative(server.config.root, modules[0].id)
            .split("?")[0]
          const count = modules.length

          server.config.logger.info(
            [
              pc.dim("(ssr)"),
              pc.green("page reload"),
              pc.dim(rel),
              count > 1 ? pc.yellow(`(x${count})`) : "",
            ]
              .filter(Boolean)
              .join(" "),
            {
              timestamp: true,
              clear: false,
            }
          )
          server.ws.send({ type: "full-reload" })
          return []
        }
      },
    },
  }
}
