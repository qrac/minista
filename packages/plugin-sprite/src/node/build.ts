import type { Plugin, UserConfig } from "vite"
import type { OutputAsset } from "rollup"
import fs from "node:fs"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
  getBasedAssetPath,
} from "minista-shared-utils"

import type { SvgSpriteConfig } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { resolveMultipleOptions } from "./option.js"
import { generateSprite } from "./utils.js"

export function pluginSpriteBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["sprite", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const mOpts = resolveMultipleOptions(opts)
  const slashStr = "__slash__"
  const backSlashStr = "__backSlash__"
  const dotStr = "__dot__"

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let spriteDir = ""
  let spriteObj: {
    [key: string]: {
      tempKey: string
      srcDir: string
      filePath: string
      config?: SvgSpriteConfig
    }
  } = {}
  let entries: { [key: string]: string } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      spriteDir = path.join(tempDir, "sprite")

      if (!isSsr) {
        for (const mOpt of mOpts) {
          const tempKeySuffix = mOpt.spriteKey ? "-" + mOpt.spriteKey : ""
          const tempKey = tempName + tempKeySuffix
          const srcDir = path.join(rootDir, mOpt.srcDir)
          const filePath = path.join(spriteDir, mOpt.outName + ".svg")

          spriteObj[tempKey] = {
            tempKey,
            srcDir,
            filePath,
            config: mOpt.config,
          }
        }
        await fs.promises.mkdir(spriteDir, { recursive: true })
        await Promise.all(
          Object.values(spriteObj).map(async (item) => {
            const { srcDir, filePath, config } = item
            await generateSprite(srcDir, filePath, config)
          })
        )
        for (const item of Object.values(spriteObj)) {
          const itemId = item.filePath
            .replace(/\//g, slashStr)
            .replace(/\\/g, backSlashStr)
            .replace(/\./g, dotStr)
          entries[itemId] = item.filePath
        }
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
      if (!isSsr) {
        const htmlItems = Object.values(bundle).filter((item) => {
          return item.fileName.endsWith(".html") && item.type === "asset"
        }) as OutputAsset[]
        const spriteNames = Object.values(spriteObj).map((item) => {
          return path.basename(item.filePath)
        })
        const spriteItems = Object.values(bundle).filter((item) => {
          if (item.fileName.endsWith(".svg") && item.type === "asset") {
            return spriteNames.includes(item.name || "")
          }
        })

        let spriteFilePathObj: { [key: string]: string } = {}

        for (const item of spriteItems) {
          for (const [key, value] of Object.entries(spriteObj)) {
            if (path.basename(value.filePath) === item.name) {
              spriteFilePathObj[key] = item.fileName
            }
          }
        }

        for (const item of htmlItems) {
          const htmlPath = item.fileName

          let parsedHtml = parseHtml(item.source as string)

          const targetAttr = "data-minista-sprite"
          const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

          if (!targetEls.length) continue

          for (const el of targetEls) {
            const spriteKeyAttr = "data-minista-sprite-key"
            const symbolIdAttr = "data-minista-sprite-symbol-id"

            const spriteKey = el.getAttribute(spriteKeyAttr) || ""
            const tempKeySuffix = spriteKey ? "-" + spriteKey : ""
            const tempKey = tempName + tempKeySuffix

            const spriteFilePath = spriteFilePathObj[tempKey]
            if (!spriteFilePath) continue

            const assetPath = getBasedAssetPath(base, htmlPath, spriteFilePath)

            const symbolId = el.getAttribute(symbolIdAttr) || ""
            const href = `${assetPath}#${symbolId}`
            el.setAttribute("href", href)
            el.removeAttribute(targetAttr)
            el.removeAttribute(spriteKeyAttr)
            el.removeAttribute(symbolIdAttr)
          }
          item.source = parsedHtml.toString()
        }
      }
    },
  }
}
