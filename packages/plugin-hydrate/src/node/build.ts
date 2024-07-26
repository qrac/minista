import type { Plugin, UserConfig } from "vite"
import type { OutputChunk, OutputAsset } from "rollup"
import fs from "node:fs"
import path from "node:path"
import fg from "fast-glob"

import type { SsgPage } from "minista-shared-utils"
import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
  getBasedAssetPath,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getPartialCode, getHydrateCode, getConcatCode } from "./code.js"
import { getPartialSerials } from "./utils.js"

export function pluginHydrateBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["hydrate", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const regCwd = new RegExp("^" + cwd)
  const aliasCwd = `/@${tempName}-cwd`

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  let ssgFiles: string[] = []
  let ssgPages: SsgPage[] = []
  let hydrateDir = ""
  let hydrateItems: { serial: number; aliasPath: string }[] = []
  let hydratePages: { fileName: string; serials: number[] }[] = []
  let hydrateEntries: { [key: string]: string } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.join(tempDir, "ssg")
      hydrateDir = path.join(tempDir, "hydrate")

      if (isSsr) {
        return {
          resolve: {
            alias: [
              {
                find: aliasCwd,
                replacement: cwd,
              },
            ],
          },
        } as UserConfig
      }

      if (!isSsr) {
        ssgFiles = await fg(path.join(ssgDir, `*.mjs`))
        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const { ssgPages }: { ssgPages: SsgPage[] } = await import(file)
              return ssgPages
            })
          )
        ).flat()

        hydratePages = ssgPages.map((page) => {
          const { fileName, html } = page
          const serials = getPartialSerials(html, opts)
          return {
            fileName,
            serials,
          }
        })
        const hydrateIds = [
          ...new Set(hydratePages.map((page) => page.serials.join("-"))),
        ]
        await fs.promises.mkdir(hydrateDir, { recursive: true })
        await Promise.all(
          hydrateIds.map(async (item) => {
            const entryKey = `${opts.outName}-${item}`
            const fileName = path.join(hydrateDir, `${entryKey}.js`)
            const serials = item.split("-").map((serial) => Number(serial))
            const code = getConcatCode(serials, "build")
            await fs.promises.writeFile(fileName, code, "utf8")
            hydrateEntries[entryKey] = fileName
          })
        )
        return {
          build: {
            rollupOptions: {
              input: hydrateEntries,
            },
          },
          resolve: {
            alias: [
              {
                find: aliasCwd,
                replacement: cwd,
              },
            ],
          },
        } as UserConfig
      }
    },
    async load(id) {
      if (isSsr) {
        if (/\.[jt]sx?\?ph$/.test(id)) {
          const aliasPath = id.replace(regCwd, aliasCwd).replace(/\?ph.*$/, "")

          let hydrateItem = hydrateItems.find(
            (item) => item.aliasPath === aliasPath
          )
          if (!hydrateItem) {
            const serial = hydrateItems.length + 1
            hydrateItem = { serial, aliasPath }
            hydrateItems.push(hydrateItem)
            const hydrateBuildDir = path.join(hydrateDir, "build")
            const fileName = path.join(hydrateBuildDir, `${serial}.jsx`)
            const code = getHydrateCode(serial, aliasPath, opts)
            await fs.promises.mkdir(hydrateBuildDir, { recursive: true })
            await fs.promises.writeFile(fileName, code, "utf8")
          }
          return getPartialCode(hydrateItem.serial, aliasPath, opts)
        }
      }
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        for (const page of hydratePages) {
          const hydrateId = page.serials.join("-")
          const assetName = `${opts.outName}-${hydrateId}`
          const assetFileName = Object.keys(bundle).find(
            (key) => bundle[key].name === assetName
          )
          if (!assetFileName) continue

          const htmlPath = page.fileName
          const htmlItem = bundle[htmlPath] as OutputAsset
          const assetPath = getBasedAssetPath(base, htmlPath, assetFileName)
          const newTag = `<script type="module" src="${assetPath}"></script>`
          const newSource = htmlItem.source
            .toString()
            .replace("</head>", newTag)
          htmlItem.source = newSource
        }

        const bundleName = getTempName(["bundle", "build"])
        const regBundle = new RegExp(
          `import\\s+["']\\./${bundleName}[^"']*["'];\\n?`,
          "g"
        )
        const hydrateFileNames = Object.keys(hydrateEntries)
        const hydrateFiles = Object.values(bundle).filter((item) => {
          const reg = /\.js$/
          return (
            item.type === "chunk" &&
            hydrateFileNames.includes(item.name) &&
            reg.test(item.fileName)
          )
        }) as OutputChunk[]

        for (const file of hydrateFiles) {
          const newCode = file.code.replace(regBundle, "")
          file.code = newCode
        }
      }
    },
  }
}
