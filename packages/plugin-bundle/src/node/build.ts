import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import { checkDeno, getCwd, getRootDir, getTempDir } from "minista-shared-utils"

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

  return {
    name: "vite-plugin:minista-bundle-build",
    config: async (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

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
        const jsItem = Object.entries(bundle).find(([_, obj]) => {
          return obj.name === id && obj.type === "chunk"
        })
        const jskey = jsItem ? jsItem[0] : ""

        const cssItem = Object.entries(bundle).find(([_, obj]) => {
          const reg = new RegExp(`${id}.*\\.css$`)
          return obj.name?.match(reg) && obj.type === "asset"
        })
        const csskey = cssItem ? cssItem[0] : ""

        if (jskey) {
          delete bundle[jskey]
        }
        if (csskey) {
          const name = bundle[csskey].fileName
          bundle[csskey].fileName = name.replace(id, opts.outName)
        }
      }
    },
  }
}
