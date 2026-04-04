/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').EnvironmentModuleNode} EnvModuleNode */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */
/** @typedef {import('./types').ResolvedLayout} ResolvedLayout */
/** @typedef {import('./types').ResolvedPage} ResolvedPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import pc from "picocolors"

import { getGlobImportCode, getSsgExportCode } from "./utils/code.js"
import { formatLayout, resolveLayout } from "./utils/layout.js"
import { formatPages, resolvePages } from "./utils/page.js"
import { transformHtml } from "./utils/html.js"
import { getHtmlFileName } from "../../shared/filename.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { mergeSsrExternal } from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  layout: "/src/layouts/index.{tsx,jsx}",
  src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
  srcBases: ["/src/pages"],
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSsg(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()
  const tempName = "__minista-ssg"
  const SSG_PAGES_ID = "virtual:ssg-pages"
  const SSG_PAGES_VIRTUAL = "\0" + SSG_PAGES_ID

  let isDev = false
  let isSsr = false
  let isBuild = false

  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let ssrDir = ""
  let ssrFile = ""
  let ssgDir = ""
  let ssgFile = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let throughDir = ""
  let throughFile = ""

  /**
   * @param {ResolvedLayout} resolvedLayout
   * @param {ResolvedPage[]} resolvedPages
   */
  function selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages) {
    ssgPages = resolvedPages
      .map((resolvedPage) => {
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
      .filter(
        /** @type {(page: SsgPage | null) => page is SsgPage} */
        (page) => page !== null,
      )
  }

  return {
    name: "vite-plugin:minista-ssg",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isSsr || isBuild
    },
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.resolve(tempDir, "glob")
      globFile = path.resolve(globDir, `${tempName}.js`)
      ssrDir = path.resolve(tempDir, "ssr")
      ssrFile = path.resolve(ssrDir, `${tempName}.mjs`)
      ssgDir = path.resolve(tempDir, "ssg")
      ssgFile = path.resolve(ssgDir, `${tempName}.mjs`)
      throughDir = path.resolve(tempDir, "through")
      throughFile = path.resolve(throughDir, `${tempName}.js`)

      if (isDev || isSsr) {
        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")
      }
      if (isDev) {
        return {
          ssr: {
            external: mergeSsrExternal(config, ["minista/context"]),
          },
        }
      }
      if (isSsr) {
        return {
          build: {
            rollupOptions: {
              input: {
                [tempName]: globFile,
              },
              output: {
                chunkFileNames: "[name].mjs",
                entryFileNames: "[name].mjs",
              },
            },
            outDir: ssrDir,
          },
          ssr: {
            external: mergeSsrExternal(config, ["minista/context"]),
          },
        }
      }
      if (isBuild) {
        const importUrl = pathToFileURL(ssrFile).href
        const { LAYOUTS = {}, PAGES = {} } = await import(importUrl)
        const formatedLayout = formatLayout(LAYOUTS)
        const resolvedLayout = await resolveLayout(formatedLayout)
        const formatedPages = formatPages(PAGES, opts)
        const resolvedPages = await resolvePages(formatedPages)

        selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages)

        const code = getSsgExportCode(ssgPages)
        await fs.promises.mkdir(ssgDir, { recursive: true })
        await fs.promises.writeFile(ssgFile, code, "utf8")
        await fs.promises.mkdir(throughDir, { recursive: true })
        await fs.promises.writeFile(throughFile, `console.log("")`, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                [tempName]: throughFile,
              },
            },
          },
        }
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

            selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages)

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
            if (e instanceof Error) server.ssrFixStacktrace(e)
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
        const stripQuery = (id) => (id ? id.split("?")[0] : undefined)

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
          isReachableFromGlob(m, globFile, SSG_PAGES_VIRTUAL),
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
            true,
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
            { timestamp: true, clear: false },
          )
          server.ws.send({ type: "full-reload" })
          return []
        }

        let hasSsrOnly = false
        const invalidated = new Set()
        const clientGraph = server.environments.client.moduleGraph

        const isKnownInClient = (/** @type {EnvModuleNode} */ mod) => {
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
            true,
          )
          hasSsrOnly = true
        }

        if (hasSsrOnly) {
          const rel = stripQuery(
            path.relative(server.config.root, modules[0].id || ""),
          )
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)].join(" "),
            { timestamp: true, clear: false },
          )
          server.ws.send({ type: "full-reload" })
          return []
        }
      },
    },
    async buildStart() {
      if (isSsr) return
      if (!ssgPages.length) return

      await Promise.all(
        ssgPages.map((ssgPage) => {
          this.emitFile({
            type: "asset",
            source: ssgPage.html,
            fileName: ssgPage.fileName,
          })
        }),
      )
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      for (const [key, item] of Object.entries(bundle)) {
        if (item.name === tempName && item.type === "chunk") {
          delete bundle[key]
          break
        }
      }
    },
  }
}
