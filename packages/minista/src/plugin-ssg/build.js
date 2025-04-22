import fs from "node:fs"
import path from "node:path"

import { getGlobImportCode, getSsgExportCode } from "./code.js"
import { formatLayout, resolveLayout } from "./layout.js"
import { formatPages, resolvePages } from "./page.js"
import { transformHtml } from "./html.js"

import { getPluginName, getTempName } from "../utils/name.js"
import { getRootDir, getTempDir, getOutputHtmlPath } from "../utils/path.js"
import { mergeSsrExternal } from "../utils/vite.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */

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
  let base = "/"
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
      base = config.base || base
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
            external: mergeSsrExternal(config, ["minista"]),
          },
        }
      }

      if (!isSsr) {
        const { LAYOUTS = {}, PAGES = {} } = await import(ssrFile)
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
            const outputHtmlPath = getOutputHtmlPath(url)
            const html = transformHtml({ resolvedLayout, resolvedPage })
            return {
              url,
              outputHtmlPath,
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
            fileName: ssgPage.outputHtmlPath,
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
