/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { generateSprite } from "./utils/sprite.js"
import { getPluginName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  extractUrls,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import { filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSpriteBuild(opts) {
  const cwd = process.cwd()
  const names = ["sprite", "build"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-sprite"
  const srcAttr = "data-minista-sprite-src"
  const symbolIdAttr = "data-minista-sprite-symbol-id"

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let spriteDir = ""
  /** @type {{[assetName: string]: string}} */
  let spriteMap = {}
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {{[before: string]: string}} */
  let entryChanges = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")
      spriteDir = path.resolve(tempDir, "sprite")

      if (isSsr) return

      const ssgFiles = await glob("*.mjs", { cwd: ssgDir })

      if (!ssgFiles.length) return

      ssgPages = (
        await Promise.all(
          ssgFiles.map(async (file) => {
            const ssgFileUrl = pathToFileURL(path.resolve(ssgDir, file)).href
            const { ssgPages } = await import(ssgFileUrl)
            return ssgPages
          })
        )
      ).flat()

      /** @type {string[]} */
      let assetNames = []
      /** @type {string[]} */
      let assetDirNames = []

      for (const ssgPage of ssgPages) {
        const { html } = ssgPage
        assetNames = [...assetNames, ...extractUrls(html, "use", srcAttr, "/")]
      }
      assetNames = [...new Set(assetNames)].map((url) => url.replace(/^\//, ""))
      assetDirNames = assetNames.map((assetName) => path.dirname(assetName))
      assetDirNames = [...new Set(assetDirNames)]

      if (!assetDirNames.length) return

      await fs.promises.mkdir(spriteDir, { recursive: true })

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
        })
      )
      return {
        build: {
          rollupOptions: {
            input: entries,
          },
        },
      }
    },
    generateBundle(options, bundle) {
      if (isSsr) return

      const outputAssets = filterOutputAssets(bundle)
      const beforeSet = new Set(Object.values(spriteMap))

      for (const item of Object.values(outputAssets)) {
        const matches = item.originalFileNames.filter((tag) =>
          beforeSet.has(tag)
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
          const assetName = el.getAttribute(srcAttr).replace(/^\//, "")
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
