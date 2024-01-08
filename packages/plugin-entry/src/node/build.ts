import type { Plugin, UserConfig } from "vite"
import type { OutputChunk, OutputAsset } from "rollup"
import path from "node:path"
import fg from "fast-glob"

import { checkDeno, getCwd, getRootDir, getTempDir } from "minista-shared-utils"

import {
  getAttrRootPaths,
  filterExistEntries,
  getObjectKeySuffix,
  getChunkCssName,
  getReplaceTagRegex,
} from "./utils.js"

type SsgPage = {
  url: string
  fileName: string
  html: string
}

export function pluginEntryBuild(): Plugin {
  const id = "__minista_entry_build"
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  let ssgFiles: string[] = []
  let ssgPages: SsgPage[] = []

  let entryCss: { [key: string]: string[] } = {}
  let entryJs: { [key: string]: string[] } = {}
  let entries: { [key: string]: string } = {}
  let entryChanges: {
    name: string
    beforeName: string
    afterName: string
    type: "css" | "js"
    htmlFiles: string[]
  }[] = []

  return {
    name: "vite-plugin:minista-entry-build",
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      if (viteCommand === "build" && !isSsr) {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        ssgDir = path.join(tempDir, "ssg")
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

        const gotPathPages = ssgPages.map((page) => {
          const { fileName, html } = page
          const cssPaths = getAttrRootPaths(html, "link", "href")
          const scriptPaths = getAttrRootPaths(html, "script", "src")
          return {
            fileName,
            cssPaths,
            scriptPaths,
          }
        })
        gotPathPages.map((page) => {
          const { fileName, cssPaths, scriptPaths } = page

          cssPaths.map((cssPath) => {
            const list = entryCss[cssPath]
            entryCss[cssPath] = [...(list || []), fileName]
          })
          scriptPaths.map((scriptPath) => {
            const list = entryJs[scriptPath]
            entryJs[scriptPath] = [...(list || []), fileName]
          })
        })
        entryCss = filterExistEntries(entryCss, rootDir)
        entryJs = filterExistEntries(entryJs, rootDir)

        Object.keys({ ...entryCss, ...entryJs }).map((file) => {
          const parsedPath = path.parse(file)
          const entryName = parsedPath.name
          const index = getObjectKeySuffix(entries, entryName, 2)
          const entryId = entryName + index
          return (entries[entryId] = path.join(rootDir, file))
        })
        return {
          build: {
            rollupOptions: {
              input: entries,
            },
          },
        } as UserConfig
      }
    },
    generateBundle(options, bundle) {
      const chunkJs = Object.entries(bundle).filter(([, item]) => {
        const reg = /\.js$/
        return item.type === "chunk" && reg.test(item.fileName)
      }) as [string, OutputChunk][]
      const assetCss = Object.entries(bundle).filter(([, item]) => {
        const reg = /\.css$/
        return item.type === "asset" && reg.test(item.fileName)
      }) as [string, OutputAsset][]

      chunkJs.map(([, item]) => {
        const facadeModuleId = item.facadeModuleId || ""
        const reg = /\.(css|scss|sass|less)$/
        const type = reg.test(facadeModuleId) ? "css" : "js"
        const entryObj = type === "css" ? entryCss : entryJs

        Object.entries(entryObj).map(([key, value]) => {
          if (facadeModuleId === path.join(rootDir, key)) {
            const afterName =
              type === "css"
                ? getChunkCssName(assetCss, item.name)
                : item.fileName
            entryChanges.push({
              name: item.name,
              beforeName: key,
              afterName,
              type: type,
              htmlFiles: value,
            })
          }
        })
      })

      entryChanges.map((item) => {
        item.htmlFiles.map((htmlFile) => {
          const html = bundle[htmlFile] as OutputAsset
          const hasHtml = html && html.type === "asset" && html.source
          const reg = getReplaceTagRegex(
            item.type === "css" ? "link" : "script",
            item.type === "css" ? "href" : "src"
          )
          if (hasHtml) {
            const newSource = html.source
              .toString()
              .replace(reg, `$1/${item.afterName}$2`)
            html.source = newSource
          }
        })
      })
    },
  }
}
