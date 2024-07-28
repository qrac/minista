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
  getAttrPaths,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getGlobImportCode } from "./code.js"

export function pluginBundleBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["bundle", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const slashStr = "__slash__"
  const dotStr = "__dot__"

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let ssgDir = ""
  let ssgPages: SsgPage[] = []
  let entries: { [key: string]: string } = {}
  let entryChanges: { before: string; after: string }[] = []

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.join(tempDir, "glob")
      globFile = path.join(globDir, `${tempName}.js`)
      ssgDir = path.join(tempDir, "ssg")

      if (!isSsr) {
        const ssgFiles = await fg(path.join(ssgDir, `*.mjs`))

        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const { ssgPages }: { ssgPages: SsgPage[] } = await import(file)
              return ssgPages
            })
          )
        ).flat()

        let preEntries: { [key: string]: string } = {}

        for (const ssgPage of ssgPages) {
          const { html } = ssgPage
          const assetPaths = [
            ...getAttrPaths(html, "link", "href", "/"),
            ...getAttrPaths(html, "script", "src", "/"),
            ...getAttrPaths(html, "img", "src", "/"),
            ...getAttrPaths(html, "img", "srcset", "/"),
            ...getAttrPaths(html, "source", "srcset", "/"),
            ...getAttrPaths(html, "use", "href", "/"),
          ]
          for (const assetPath of assetPaths) {
            const assetPathId = assetPath
              .replace(/\//g, slashStr)
              .replace(/\./g, dotStr)
            const assetDirs = assetPath.split("/")
            const fullPath = path.join(rootDir, ...assetDirs)
            preEntries[assetPathId] = fullPath
          }
        }

        for (const [key, value] of Object.entries(preEntries)) {
          if (fs.existsSync(value)) {
            entries[key] = value
          }
        }

        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                ...entries,
                [tempName]: globFile,
              },
            },
          },
        } as UserConfig
      }
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        let hasBundle = false
        let bundleName = ""

        const regBundle = new RegExp(`${tempName}.*\\.css$`)

        for (const [key, item] of Object.entries(bundle)) {
          if (item.name === tempName && item.type === "chunk") {
            delete bundle[key]
          }
          if (item.name?.match(regBundle) && item.type === "asset") {
            hasBundle = true
            bundleName = item.fileName.replace(tempName, opts.outName)
            bundle[key].fileName = bundleName
          }
        }

        for (const [key, value] of Object.entries(entries)) {
          const newName = path.parse(value).name
          const items = Object.values(bundle).filter((item) => {
            if (item.name?.startsWith(key)) {
              if (item.type === "chunk") {
                return item.code.trim() ? true : false
              } else {
                return true
              }
            }
          })
          for (const item of items) {
            item.fileName = item.fileName?.replace(key, newName)

            const regSlashStr = new RegExp(slashStr, "g")
            const regDotStr = new RegExp(dotStr, "g")

            entryChanges.push({
              before: key.replace(regSlashStr, "/").replace(regDotStr, "."),
              after: item.fileName,
            })
          }
        }

        const htmlItems = Object.values(bundle).filter((item) => {
          return item.fileName.endsWith(".html") && item.type === "asset"
        }) as OutputAsset[]
        const regImg = /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i
        const afterItems = entryChanges.map((item) => item.after)
        const otherImgItems = Object.values(bundle).filter((item) => {
          if (item.fileName.match(regImg) && item.type === "asset") {
            return !afterItems.includes(item.fileName) ? true : false
          }
        }) as OutputAsset[]

        for (const item of htmlItems) {
          const htmlPath = item.fileName
          let newHtml = item.source as string

          for (const change of entryChanges) {
            const { before, after } = change
            const assetPath = getBasedAssetPath(base, htmlPath, after)
            const regExp = new RegExp(`(<[^>]*?)${before}([^>]*?>)`, "gs")
            newHtml = newHtml.replace(regExp, `$1${assetPath}$2`)
          }

          if (hasBundle) {
            const assetPath = getBasedAssetPath(base, htmlPath, bundleName)
            const linkTag = `<link rel="stylesheet" href="${assetPath}">`
            newHtml = newHtml.replace("</head>", `${linkTag}</head>`)
          }

          if (base === "./") {
            for (const item of otherImgItems) {
              const imgPath = item.fileName
              const assetPath = getBasedAssetPath(base, htmlPath, imgPath)
              const regExp = new RegExp(`(<[^>]*?)/${imgPath}([^>]*?>)`, "gs")
              newHtml = newHtml.replace(regExp, `$1${assetPath}$2`)
            }
          }
          item.source = newHtml
        }
      }
    },
  }
}
