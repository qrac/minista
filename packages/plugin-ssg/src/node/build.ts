import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import type { SsgPage } from "minista-shared-utils"
import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
  getHtmlPath,
  getBasedAssetPath,
} from "minista-shared-utils"

import type { ImportedLayouts, ImportedPages } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getGlobExportCode, getSsgExportCode } from "./code.js"
import { formatLayout, resolveLayout } from "./layout.js"
import { formatPages, resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

export function pluginSsgBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["ssg", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let base = "/"
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
    name: pluginName,
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false
      base = config.base || base

      if (viteCommand === "build") {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${tempName}.js`)
        ssrDir = path.join(tempDir, "ssr")
        ssrFile = path.join(ssrDir, `${tempName}.mjs`)
        ssgDir = path.join(tempDir, "ssg")
        ssgFile = path.join(ssgDir, `${tempName}.mjs`)
        throughDir = path.join(tempDir, "through")
        throughFile = path.join(throughDir, `${tempName}.js`)
      }

      if (viteCommand === "build" && isSsr) {
        const code = getGlobExportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

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
            external: ["minista-shared-head"],
          },
        } as UserConfig
      }

      if (viteCommand === "build" && !isSsr) {
        const { LAYOUTS, PAGES } = (await import(ssrFile)) as {
          LAYOUTS: ImportedLayouts
          PAGES: ImportedPages
        }
        const formatedLayout = formatLayout(LAYOUTS)
        const resolvedLayout = await resolveLayout(formatedLayout)
        const formatedPages = formatPages(PAGES, opts)
        const resolvedPages = await resolvePages(formatedPages)

        ssgPages = await Promise.all(
          resolvedPages.map(async (resolvedPage) => {
            const url = resolvedPage.path
            const fileName = getHtmlPath(url)
            const html = transformHtml({ resolvedLayout, resolvedPage })
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
                [tempName]: throughFile,
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
        let jsKey = ""

        for (const [key, obj] of Object.entries(bundle)) {
          if (obj.name === tempName && obj.type === "chunk") {
            jsKey = key
            break
          }
        }
        if (jsKey) {
          delete bundle[jsKey]
        }
      }

      if (viteCommand === "build" && !isSsr && base === "./") {
        const imageKeys: string[] = []

        for (const [key, obj] of Object.entries(bundle)) {
          const regImg = /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i

          if (obj.name?.match(regImg) && obj.type === "asset") {
            imageKeys.push(key)
          }
        }

        for (const [key, obj] of Object.entries(bundle)) {
          if (key.endsWith(".html") && obj.type === "asset") {
            let html = obj.source as string

            for (const imageKey of imageKeys) {
              const assetPath = getBasedAssetPath(base, key, imageKey)
              const regExp = new RegExp(
                `(<(?:meta|link|img|source)\\b[^>]*?["'])/${imageKey}(["'][^>]*?>)`,
                "g"
              )
              html = html.replace(regExp, `$1${assetPath}$2`)
            }

            obj.source = html
          }
        }
      }
    },
  }
}
