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

import type { ImportedLayouts, ImportedStories } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getGlobExportCode } from "./code.js"
import { formatLayout, resolveLayout } from "./layout.js"
import { formatStories } from "./story.js"
import { resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

export function pluginStoryServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["story", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let viteCommand: "build" | "serve"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  return {
    name: pluginName,
    config: async (config, { command }) => {
      viteCommand = command

      if (viteCommand === "serve") {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${tempName}.js`)

        const code = getGlobExportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          ssr: {
            external: ["minista-shared-head"],
          },
        } as UserConfig
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
            const { LAYOUTS, STORIES } = (await ssr(globFile)) as {
              LAYOUTS: ImportedLayouts
              STORIES: ImportedStories
            }
            const formatedLayout = formatLayout(LAYOUTS)
            const resolvedLayout = await resolveLayout(formatedLayout)
            const formatedPages = formatStories(STORIES, opts)
            const resolvedPages = await resolvePages(formatedPages)
            const resolvedPage = resolvedPages.find((page) => page.path === url)

            let html = ""

            if (resolvedPage) {
              html = transformHtml({ resolvedLayout, resolvedPage })
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
