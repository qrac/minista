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
  getBasedAssetPath,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getGlobImportCode } from "./code.js"

export function pluginBundleBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["bundle", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""

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

      if (!isSsr) {
        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")

        return {
          build: {
            rollupOptions: {
              input: {
                [tempName]: globFile,
              },
            },
          },
        } as UserConfig
      }
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        let jsKey = ""
        let cssKey = ""

        const reg = new RegExp(`${tempName}.*\\.css$`)

        for (const [key, obj] of Object.entries(bundle)) {
          if (obj.name === tempName && obj.type === "chunk") {
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
          const newName = name.replace(tempName, opts.outName)
          bundle[cssKey].fileName = newName

          for (const [key, fileData] of Object.entries(bundle)) {
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
