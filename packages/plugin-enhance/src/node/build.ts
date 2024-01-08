import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import {
  checkDeno,
  getCwd,
  getRootDir,
  getTempDir,
  getHtmlPath,
} from "minista-shared-utils"

import type { ImportedPages, SsgPage } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getGlobExportCode, getSsgExportCode } from "./code.js"
import { formatPages, resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

export function pluginEnhanceBuild(opts: PluginOptions): Plugin {
  const id = "__minista_enhance_build"
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let ssrDir = ""
  let ssrFile = ""
  let ssgDir = ""
  let ssgFile = ""
  let ssgPages: SsgPage[] = []
  let throughDir = ""
  let throughFile = ""

  return {
    name: "vite-plugin:minista-enhance-build",
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      if (viteCommand === "build") {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${id}.js`)
        ssrDir = path.join(tempDir, "ssr")
        ssrFile = path.join(ssrDir, `${id}.mjs`)
        ssgDir = path.join(tempDir, "ssg")
        ssgFile = path.join(ssgDir, `${id}.mjs`)
        throughDir = path.join(tempDir, "through")
        throughFile = path.join(throughDir, `${id}.js`)
      }

      if (viteCommand === "build" && isSsr) {
        const code = getGlobExportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                [id]: globFile,
              },
              output: {
                entryFileNames: "[name].mjs",
              },
            },
            outDir: ssrDir,
          },
        } as UserConfig
      }

      if (viteCommand === "build" && !isSsr) {
        const { PAGES } = (await import(ssrFile)) as {
          PAGES: ImportedPages
        }
        const formatedPages = formatPages(PAGES, opts)
        const resolvedPages = resolvePages(formatedPages)

        ssgPages = await Promise.all(
          resolvedPages.map((resolvedPage) => {
            const url = resolvedPage.path
            const html = transformHtml({ resolvedPage })
            const fileName = getHtmlPath(url)
            return {
              url,
              fileName,
              html,
            }
          })
        )
        const code = getSsgExportCode(ssgPages)
        await fs.promises.mkdir(ssgDir, { recursive: true })
        await fs.promises.writeFile(ssgFile, code, "utf8")

        await fs.promises.mkdir(throughDir, { recursive: true })
        await fs.promises.writeFile(throughFile, `console.log("")`, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                [id]: throughFile,
              },
            },
          },
        } as UserConfig
      }
    },
    async buildStart() {
      if (viteCommand === "build" && !isSsr && ssgPages.length > 0) {
        await Promise.all(
          ssgPages.map((ssgPage) => {
            this.emitFile({
              type: "asset",
              source: ssgPage.html,
              fileName: ssgPage.fileName,
            })
          })
        )
      }
    },
    generateBundle(options, bundle) {
      if (viteCommand === "build" && !isSsr) {
        const jsItem = Object.entries(bundle).find(([_, obj]) => {
          return obj.name === id && obj.type === "chunk"
        })
        const jskey = jsItem ? jsItem[0] : ""

        if (jskey) {
          delete bundle[jskey]
        }
      }
    },
  }
}
