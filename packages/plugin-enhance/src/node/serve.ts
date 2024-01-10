import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import { checkDeno, getCwd, getRootDir, getTempDir } from "minista-shared-utils"

import type { ImportedPages } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getGlobExportCode } from "./code.js"
import { formatPages, resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

export function pluginEnhanceServe(opts: PluginOptions): Plugin {
  const id = "__minista_enhance_serve"
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)

  let viteCommand: "build" | "serve"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  return {
    name: "vite-plugin:minista-enhance-serve",
    config: async (config, { command }) => {
      viteCommand = command

      if (viteCommand === "serve") {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${id}.js`)

        const code = getGlobExportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")
      }
    },
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const base = server.config.base
            const hasBaseDir = base && base !== "/"
            const originalUrl = req.originalUrl || ""
            const url = hasBaseDir
              ? originalUrl.replace(new RegExp(`^${base}`), "/")
              : originalUrl

            const ssr = server.ssrLoadModule
            const { PAGES } = (await ssr(globFile)) as {
              PAGES: ImportedPages
            }
            const formatedPages = formatPages(PAGES, opts)
            const resolvedPages = resolvePages(formatedPages)
            const resolvedPage = resolvedPages.find((page) => page.path === url)

            let html = ""

            if (resolvedPage) {
              html = transformHtml({ resolvedPage })
              html = await server.transformIndexHtml(originalUrl, html)
              res.statusCode = 200
              res.end(html)
            } else {
              next()
            }
          } catch (e: any) {
            server.ssrFixStacktrace(e)
            next(e)
          }
        })
      }
    },
  }
}
