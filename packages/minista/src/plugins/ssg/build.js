/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"

import { getGlobImportCode, getSsgExportCode } from "./utils/code.js"
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
export function pluginSsgBuild(opts) {
  const cwd = process.cwd()
  const names = ["ssg", "build"]
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
  /** @type {SsgPage[]} */
  let ssgPages = []
  let throughDir = ""
  let throughFile = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
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

      if (isSsr) {
        const code = getGlobImportCode(opts)
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
            external: mergeSsrExternal(config, ["minista/context"]),
          },
        }
      }

      if (!isSsr) {
        const importUrl = pathToFileURL(ssrFile).href
        const { LAYOUTS = {}, PAGES = {} } = await import(importUrl)
        const formatedLayout = formatLayout(LAYOUTS)
        const resolvedLayout = await resolveLayout(formatedLayout)
        const formatedPages = formatPages(PAGES, opts)
        const resolvedPages = await resolvePages(formatedPages)

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
        })
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
