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
  getHtmlPath,
} from "minista-shared-utils"

import type {
  ImportedLayouts,
  ImportedStories,
  SsgPage,
} from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getGlobExportCode, getSsgExportCode } from "./code.js"
import { formatLayout, resolveLayout } from "./layout.js"
import { formatStories } from "./story.js"
import { resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

export function pluginStoryBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["story", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

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
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
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

      if (isSsr) {
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

      if (!isSsr) {
        const { LAYOUTS, STORIES } = (await import(ssrFile)) as {
          LAYOUTS: ImportedLayouts
          STORIES: ImportedStories
        }
        const formatedLayout = formatLayout(LAYOUTS)
        const resolvedLayout = await resolveLayout(formatedLayout)
        const formatedPages = formatStories(STORIES, opts)
        const resolvedPages = await resolvePages(formatedPages)

        ssgPages = await Promise.all(
          resolvedPages.map((resolvedPage) => {
            const url = resolvedPage.path
            const html = transformHtml({ resolvedLayout, resolvedPage })
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
                [tempName]: throughFile,
              },
            },
          },
        } as UserConfig
      }
    },
    async buildStart() {
      if (!isSsr && ssgPages.length > 0) {
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
      if (!isSsr) {
        for (const [key, item] of Object.entries(bundle)) {
          if (item.name === tempName && item.type === "chunk") {
            delete bundle[key]
            break
          }
        }
      }
    },
  }
}
