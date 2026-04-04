/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { generateSprite } from "./utils/sprite.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  extractUrls,
  getServeBase,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import { mergeAlias, filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSprite(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()
  const spriteAlias = `/@__minista-sprite`
  const targetAttr = "data-minista-sprite"
  const srcAttr = "data-minista-sprite-src"
  const symbolIdAttr = "data-minista-sprite-symbol-id"

  let isDev = false
  let isSsr = false
  let isBuild = false

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let spriteDir = ""
  /** @type {string[]} */
  let assetNames = []
  /** @type {string[]} */
  let assetDirNames = []
  /** @type {{[assetName: string]: string}} */
  let assetMap = {}
  /** @type {Set<string>} */
  let watchDirs = new Set()
  /** @type {ViteDevServer} */
  let viteServer
  /** @type {{[assetName: string]: string}} */
  let spriteMap = {}
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {{[before: string]: string}} */
  let entryChanges = {}

  /**
   * @param {string[]} htmlArray
   */
  function selfUpdateAssetDirNames(htmlArray) {
    for (const html of htmlArray) {
      assetNames = [...assetNames, ...extractUrls(html, "use", srcAttr, "/")]
    }
    assetNames = [...new Set(assetNames)].map((url) => url.replace(/^\//, ""))
    assetDirNames = assetNames.map((assetName) => path.dirname(assetName))
    assetDirNames = [...new Set(assetDirNames)]
  }

  return {
    name: "vite-plugin:minista-sprite",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      spriteDir = path.resolve(tempDir, "sprite")
      await fs.promises.mkdir(spriteDir, { recursive: true })

      if (isDev) {
        base = getServeBase(config.base || base)
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
      }
      if (isBuild) {
        base = getBuildBase(config.base || base)
        ssgDir = path.resolve(tempDir, "ssg")

        const ssgFiles = await glob("*.mjs", { cwd: ssgDir })
        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const ssgFileUrl = pathToFileURL(path.resolve(ssgDir, file)).href
              const { ssgPages } = await import(ssgFileUrl)
              return ssgPages
            }),
          )
        ).flat()

        if (!ssgPages.length) return

        const htmlArray = ssgPages.map((page) => page.html)

        selfUpdateAssetDirNames(htmlArray)
        if (!assetDirNames.length) return

        for (const assetName of assetNames) {
          const name = path.basename(path.dirname(assetName))
          const fullPath = path.resolve(spriteDir, `${name}.svg`)
          spriteMap[assetName] = normalizePath(path.relative(rootDir, fullPath))
        }

        await Promise.all(
          assetDirNames.map(async (assetDirName) => {
            const targetDir = path.resolve(rootDir, assetDirName)
            const name = path.basename(targetDir)
            const fullPath = path.resolve(spriteDir, `${name}.svg`)
            const sprite = await generateSprite(targetDir, opts.config)
            await fs.promises.writeFile(fullPath, sprite, "utf8")
            const pathId = normalizePath(path.relative(rootDir, fullPath))
            entries[pathId] = fullPath
          }),
        )
        return {
          build: {
            rollupOptions: {
              input: entries,
            },
          },
        }
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
      selfUpdateAssetDirNames([html])
      if (!assetDirNames.length) return html

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
        }),
      )

      let parsedHtml = parseHtml(html)
      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

      if (!targetEls.length) return html

      for (const el of targetEls) {
        const assetName = el?.getAttribute(srcAttr)?.replace(/^\//, "") || ""
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
    generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const beforeSet = new Set(Object.values(spriteMap))

      for (const item of Object.values(outputAssets)) {
        const matches = item.originalFileNames.filter((tag) =>
          beforeSet.has(tag),
        )
        if (matches.length > 0) {
          entryChanges[matches[0]] = item.fileName
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })

      for (const item of htmlItems) {
        const htmlName = item.fileName
        const html = String(item.source)

        let parsedHtml = parseHtml(html)
        const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

        if (!targetEls.length) continue

        for (const el of targetEls) {
          const assetName = el?.getAttribute(srcAttr)?.replace(/^\//, "") || ""
          const symbolId =
            el.getAttribute(symbolIdAttr) || path.parse(assetName).name
          const before = spriteMap[assetName]
          const after = entryChanges[before]
          const assetUrl = getBasedAssetUrl(base, htmlName, after)
          const href = `${assetUrl}#${symbolId}`
          el.setAttribute("href", href)
          el.removeAttribute(targetAttr)
          el.removeAttribute(srcAttr)
          el.removeAttribute(symbolIdAttr)
        }
        item.source = parsedHtml.toString()
      }
    },
  }
}
