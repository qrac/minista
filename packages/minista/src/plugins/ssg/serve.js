/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('rolldown-vite').EnvironmentModuleNode} EnvModuleNode */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import pc from "picocolors"

import { getGlobImportCode } from "./utils/code.js"
import { formatLayout, resolveLayout } from "./utils/layout.js"
import { formatPages, resolvePages } from "./utils/page.js"
import { transformHtml } from "./utils/html.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getHtmlFileName } from "../../shared/filename.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { mergeSsrExternal } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSsgServe(opts) {
  const cwd = process.cwd()
  const names = ["ssg", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const SSG_PAGES_ID = "virtual:ssg-pages"
  const SSG_PAGES_VIRTUAL = "\0" + SSG_PAGES_ID

  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  /** @type {SsgPage[]} */
  let ssgPages = []

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.resolve(tempDir, "glob")
      globFile = path.resolve(globDir, `${tempName}.js`)

      const code = getGlobImportCode(opts)
      await fs.promises.mkdir(globDir, { recursive: true })
      await fs.promises.writeFile(globFile, code, "utf8")

      return {
        ssr: {
          external: mergeSsrExternal(config, ["minista/context"]),
        },
      }
    },
    resolveId(id) {
      if (id === SSG_PAGES_ID) {
        return SSG_PAGES_VIRTUAL
      }
      return null
    },
    load(id) {
      if (id === SSG_PAGES_VIRTUAL) {
        return `export default ${JSON.stringify(ssgPages)};`
      }
      return null
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

            ssgPages = await Promise.all(
              resolvedPages.map(async (resolvedPage) => {
                if (resolvedPage.metadata?.draft === true) {
                  return null
                }
                const url = resolvedPage.url
                const fileName = getHtmlFileName(url)
                const html = transformHtml({ resolvedLayout, resolvedPage })
                return {
                  url,
                  fileName,
                  html,
                }
              })
            )
            ssgPages = ssgPages.filter(Boolean)

            const mod = server.moduleGraph.getModuleById(SSG_PAGES_VIRTUAL)
            if (mod) server.moduleGraph.invalidateModule(mod)

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
      order: "pre",
      handler({ modules, server, timestamp }) {
        if (this.environment.name !== "ssr") return

        /**
         * @param {string | undefined | null} id
         * @returns {string | undefined}
         */
        const stripQuery = (id) => (id ? id.split("?")[0] : id)

        /**
         * @param {EnvModuleNode | null | undefined} mod
         * @param {string} globFileAbs
         * @param {string} virtualId
         * @returns {boolean}
         */
        function isReachableFromGlob(mod, globFileAbs, virtualId) {
          /** @type {Set<EnvModuleNode>} */
          const seen = new Set()
          /** @type {EnvModuleNode[]} */
          const q = []

          if (!mod) return false
          q.push(mod)

          const rootA = stripQuery(globFileAbs)
          const rootB = stripQuery(virtualId)

          while (q.length) {
            const cur = q.shift()
            if (!cur || seen.has(cur)) continue
            seen.add(cur)

            if (!cur.importers) continue
            for (const imp of cur.importers) {
              if (!imp) continue
              const impId = stripQuery(imp.id)
              if (impId === rootA || impId === rootB) {
                return true
              }
              q.push(imp)
            }
          }
          return false
        }

        const touchSsrHtml = modules.some((m) =>
          isReachableFromGlob(m, globFile, SSG_PAGES_VIRTUAL)
        )

        const ssrGraph = server.environments?.ssr?.moduleGraph

        /** @type {EnvModuleNode | null} */
        const vmod = ssrGraph?.getModuleById(SSG_PAGES_VIRTUAL) ?? null
        if (vmod) {
          ssrGraph.invalidateModule(vmod, new Set(), Date.now(), true)
        }
        if (vmod) {
          this.environment.moduleGraph.invalidateModule(
            vmod,
            new Set(),
            timestamp,
            true
          )
        }

        if (touchSsrHtml) {
          const rel = modules[0]?.id
            ? stripQuery(path.relative(server.config.root, modules[0].id))
            : ""
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)]
              .filter(Boolean)
              .join(" "),
            { timestamp: true, clear: false }
          )
          server.ws.send({ type: "full-reload" })
          return []
        }

        let hasSsrOnly = false
        const invalidated = new Set()
        const clientGraph = server.environments.client.moduleGraph

        const isKnownInClient = (mod) => {
          if (!mod?.id) return false
          if (clientGraph.getModuleById(mod.id)) return true
          const file = mod.file ?? stripQuery(mod.id)
          const set = file ? clientGraph.getModulesByFile(file) : null
          return Boolean(set && set.size > 0)
        }

        for (const mod of modules) {
          if (!mod?.id) continue
          if (isKnownInClient(mod)) continue
          this.environment.moduleGraph.invalidateModule(
            mod,
            invalidated,
            timestamp,
            true
          )
          hasSsrOnly = true
        }

        if (hasSsrOnly) {
          const rel = stripQuery(
            path.relative(server.config.root, modules[0].id)
          )
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)].join(" "),
            { timestamp: true, clear: false }
          )
          server.ws.send({ type: "full-reload" })
          return []
        }
      },
    },
  }
}
