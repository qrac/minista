/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { generateSprite } from "./utils/sprite.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { extractUrls, getServeBase } from "../../shared/url.js"
import { mergeAlias } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSpriteServe(opts) {
  const cwd = process.cwd()
  const names = ["sprite", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const spriteAlias = `/@${tempName}-sprite`
  const targetAttr = "data-minista-sprite"
  const srcAttr = "data-minista-sprite-src"
  const symbolIdAttr = "data-minista-sprite-symbol-id"

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let spriteDir = ""
  /** @type {{[assetName: string]: string}} */
  let assetMap = {}
  /** @type {Set<string>} */
  let watchDirs = new Set()

  /** @type {ViteDevServer} */
  let viteServer

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      base = getServeBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      spriteDir = path.resolve(tempDir, "sprite")

      await fs.promises.mkdir(spriteDir, { recursive: true })
      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: spriteAlias,
              replacement: normalizePath(spriteDir),
            },
          ]),
        },
      }
    },
    configureServer(server) {
      viteServer = server

      server.watcher.on("all", async (event, filePath) => {
        if (!filePath.endsWith(".svg")) return

        const triggers = ["add", "change", "unlink"]
        const targetDir = path.dirname(filePath)

        if (triggers.includes(event) && watchDirs.has(targetDir)) {
          const name = path.basename(targetDir)
          const fullPath = path.resolve(spriteDir, `${name}.svg`)
          const sprite = await generateSprite(targetDir, opts.config)
          await fs.promises.writeFile(fullPath, sprite, "utf8")
          server.ws.send({ type: "full-reload" })
        }
      })
    },
    async transformIndexHtml(html) {
      /** @type {string[]} */
      let assetNames = []
      /** @type {string[]} */
      let assetDirNames = []

      assetNames = [...assetNames, ...extractUrls(html, "use", srcAttr, "/")]
      assetNames = [...new Set(assetNames)].map((url) => url.replace(/^\//, ""))
      assetDirNames = assetNames.map((assetName) => path.dirname(assetName))
      assetDirNames = [...new Set(assetDirNames)]

      if (!assetNames.length) return html

      for (const assetName of assetNames) {
        const name = path.basename(path.dirname(assetName))
        const aliasUrl = normalizePath(`${spriteAlias}/${name}.svg`)
        assetMap[assetName] = aliasUrl
      }

      await Promise.all(
        assetDirNames.map(async (assetDirName) => {
          const watchDir = path.resolve(rootDir, assetDirName)
          if (!watchDirs.has(watchDir)) {
            const name = path.basename(assetDirName)
            const fullPath = path.resolve(spriteDir, `${name}.svg`)
            const sprite = await generateSprite(watchDir, opts.config)
            await fs.promises.writeFile(fullPath, sprite, "utf8")
            watchDirs.add(watchDir)
            if (viteServer) {
              viteServer.watcher.add(spriteDir)
            }
          }
        })
      )

      let parsedHtml = parseHtml(html)
      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

      if (!targetEls.length) return html

      for (const el of targetEls) {
        const assetName = el.getAttribute(srcAttr).replace(/^\//, "")
        const symbolId =
          el.getAttribute(symbolIdAttr) || path.parse(assetName).name
        const assetUrl = assetMap[assetName]
        const timestamp = Date.now()
        const prefixBase = base.replace(/\/$/, "")
        const href = `${prefixBase}${assetUrl}?t=${timestamp}#${symbolId}`
        el.setAttribute("href", href)
        el.removeAttribute(targetAttr)
        el.removeAttribute(srcAttr)
        el.removeAttribute(symbolIdAttr)
      }
      return parsedHtml.toString()
    },
  }
}
