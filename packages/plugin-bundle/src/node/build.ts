import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import {
  checkDeno,
  getCwd,
  getRootDir,
  getTempDir,
  getBasedAssetPath,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getGlobImportCode } from "./code.js"

export function pluginBundleBuild(opts: PluginOptions): Plugin {
  const id = "__minista_bundle_build"
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

  let base = "/"

  return {
    name: "vite-plugin:minista-bundle-build",
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      base = config.base || base

      if (viteCommand === "build" && !isSsr) {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        globDir = path.join(tempDir, "glob")
        globFile = path.join(globDir, `${id}.js`)

        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                [id]: globFile,
              },
            },
          },
        } as UserConfig
      }
    },
    generateBundle(options, bundle) {
      if (viteCommand === "build" && !isSsr) {
        let jsKey = ""
        let cssKey = ""

        for (const key in bundle) {
          const obj = bundle[key]
          const reg = new RegExp(`${id}.*\\.css$`)

          if (obj.name === id && obj.type === "chunk") {
            jsKey = key
          }
          if (obj.name?.match(reg) && obj.type === "asset") {
            cssKey = key
          }
        }

        if (jsKey) {
          delete bundle[jsKey]
        }
        if (cssKey) {
          const name = bundle[cssKey].fileName
          const newName = name.replace(id, opts.outName)
          bundle[cssKey].fileName = newName

          for (const key in bundle) {
            const fileData = bundle[key]

            if (key.endsWith(".html") && fileData.type === "asset") {
              const html = fileData.source as string
              const assetPath = getBasedAssetPath(base, key, newName)
              const linkTag = `<link rel="stylesheet" href="${assetPath}">`
              const newHtml = html.replace("</head>", `${linkTag}</head>`)
              fileData.source = newHtml
            }
          }
        }
      }
    },
  }
}
