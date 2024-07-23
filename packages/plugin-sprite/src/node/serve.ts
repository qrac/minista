import type { Plugin, UserConfig } from "vite"
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
} from "minista-shared-utils"

import type { SvgSpriteConfig } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { resolveMultipleOptions } from "./option.js"
import { generateSprite } from "./utils.js"

export function pluginSpriteServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["sprite", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const mOpts = resolveMultipleOptions(opts)
  const aliasSprite = `/@${tempName}-sprite`

  let rootDir = ""
  let tempDir = ""
  let spriteDir = ""
  let spriteObj: {
    [key: string]: {
      tempKey: string
      srcDir: string
      filePath: string
      aliasFilePath: string
      config?: SvgSpriteConfig
    }
  } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      spriteDir = path.join(tempDir, "sprite")

      for (const mOpt of mOpts) {
        const tempKeySuffix = mOpt.spriteKey ? "-" + mOpt.spriteKey : ""
        const tempKey = tempName + tempKeySuffix
        const srcDir = path.join(rootDir, mOpt.srcDir)
        const filePath = path.join(spriteDir, mOpt.outName + ".svg")
        const aliasFilePath = aliasSprite + "/" + mOpt.outName + ".svg"

        spriteObj[tempKey] = {
          tempKey,
          srcDir,
          filePath,
          aliasFilePath,
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
      return {
        resolve: {
          alias: [
            {
              find: aliasSprite,
              replacement: spriteDir,
            },
          ],
        },
      } as UserConfig
    },
    configureServer(server) {
      const watchSprite = async () => {
        await Promise.all(
          Object.values(spriteObj).map(async (item) => {
            const { srcDir, filePath, config } = item
            const watcher = server.watcher.add(srcDir)

            watcher.on("all", async (eventName, path) => {
              const triggers = ["add", "change", "unlink"]

              if (triggers.includes(eventName) && path.includes(srcDir)) {
                await generateSprite(srcDir, filePath, config)
                server.ws.send({ type: "full-reload" })
              }
            })
          })
        )
      }
      watchSprite()
    },
    transformIndexHtml(html) {
      let parsedHtml = parseHtml(html)

      const targetAttr = "data-minista-sprite"
      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

      if (!targetEls.length) return html

      for (const el of targetEls) {
        const spriteKeyAttr = "data-minista-sprite-key"
        const symbolIdAttr = "data-minista-sprite-symbol-id"

        const spriteKey = el.getAttribute(spriteKeyAttr) || ""
        const tempKeySuffix = spriteKey ? "-" + spriteKey : ""
        const tempKey = tempName + tempKeySuffix

        const spriteItem = spriteObj[tempKey]
        if (!spriteItem) continue

        const symbolId = el.getAttribute(symbolIdAttr) || ""
        const href = `${spriteItem.aliasFilePath}#${symbolId}`
        el.setAttribute("href", href)
        el.removeAttribute(targetAttr)
        el.removeAttribute(spriteKeyAttr)
        el.removeAttribute(symbolIdAttr)
      }
      return parsedHtml.toString()
    },
  }
}
