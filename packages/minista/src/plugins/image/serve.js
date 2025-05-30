/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UrlIndexMap} UrlIndexMap */
/** @typedef {import('./types').UrlNameMap} UrlNameMap */
/** @typedef {import('./types').bufferHashMap} bufferHashMap */
/** @typedef {import('./types').ImageRecipeMap} ImageRecipeMap */
/** @typedef {import('./types').ImageCache} ImageCache */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pc from "picocolors"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { getRemote } from "./utils/remote.js"
import { resolveOptimizeOption } from "./utils/option.js"
import { generateHash } from "./utils/hash.js"
import { getSize } from "./utils/size.js"
import { getRatio } from "./utils/ratio.js"
import { getView } from "./utils/view.js"
import { getPatternMap, getPatternAttrs } from "./utils/pattern.js"
import { runSharp } from "./utils/sharp.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { extractUrls, getServeBase } from "../../shared/url.js"
import { mergeAlias } from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginImageServe(opts) {
  const cwd = process.cwd()
  const names = ["image", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const { useCache } = opts
  const imageAlias = `/@${tempName}-image`
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"
  const cpImagePath = path.resolve(__dirname, "components/image.js")
  const cpPicturePath = path.resolve(__dirname, "components/picture.js")

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let remoteDir = ""
  let imageDir = ""
  let imageDirStr = ""
  let imageCacheFile = ""
  /** @type {ImageCache} */
  let imageCache = {
    urlIndexMap: {},
    urlNameMap: {},
    recipeMap: {},
  }
  let urlIndex = 0
  /** @type {UrlIndexMap} */
  let urlIndexMap = {}
  /** @type {UrlNameMap} */
  let urlNameMap = {}
  /** @type {bufferHashMap} */
  let bufferHashMaps = {}
  /** @type {ImageRecipeMap} */
  let recipeMap = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      base = getServeBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      remoteDir = path.resolve(tempDir, "remote")
      imageDir = path.resolve(tempDir, "image")
      imageDirStr = normalizePath(path.relative(rootDir, imageDir))
      imageCacheFile = path.resolve(imageDir, "cache.json")

      await fs.promises.mkdir(remoteDir, { recursive: true })
      await fs.promises.mkdir(imageDir, { recursive: true })
      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: imageAlias,
              replacement: imageDir,
            },
          ]),
        },
      }
    },
    async transformIndexHtml(html) {
      if (useCache && fs.existsSync(imageCacheFile)) {
        imageCache = JSON.parse(
          await fs.promises.readFile(imageCacheFile, "utf8")
        )
      }
      if (useCache) {
        const indexes = Object.values(imageCache.urlIndexMap) || []
        urlIndex = indexes.length ? Math.max(...indexes) : 0
        urlIndexMap = { ...imageCache.urlIndexMap }
        urlNameMap = { ...imageCache.urlNameMap }
        recipeMap = { ...imageCache.recipeMap }
      }

      let remoteUrls = [
        ...extractUrls(html, "img", srcAttr, "http"),
        ...extractUrls(html, "source", srcAttr, "http"),
      ]
      let imageNames = [
        ...extractUrls(html, "img", srcAttr, "/"),
        ...extractUrls(html, "source", srcAttr, "/"),
      ]
      remoteUrls = [...new Set(remoteUrls)].sort()
      imageNames = [...new Set(imageNames), ...remoteUrls]
        .sort()
        .map((url) => url.replace(/^\//, ""))

      for (const remoteUrl of remoteUrls) {
        if (!urlIndexMap[remoteUrl]) {
          urlIndex = urlIndex + 1
          urlIndexMap[remoteUrl] = urlIndex
        }
      }

      await Promise.all(
        Object.entries(urlIndexMap).map(async ([remoteUrl, index]) => {
          if (useCache && imageCache.urlIndexMap[remoteUrl]) return

          console.log(pc.gray(`[download] ${remoteUrl}`))
          const remoteItem = await getRemote(remoteUrl, "__r", index)

          if (!remoteItem) return

          const { fileName, data } = remoteItem
          const fullPath = path.resolve(remoteDir, fileName)
          await fs.promises.writeFile(fullPath, data, "utf8")

          urlNameMap[remoteUrl] = normalizePath(
            path.relative(rootDir, fullPath)
          )
        })
      )

      await Promise.all(
        imageNames.map(async (imageName) => {
          if (imageName.startsWith("http")) {
            imageName = urlNameMap[imageName]
          }
          if (!imageName) return

          const fullPath = path.resolve(rootDir, imageName)
          if (!fs.existsSync(fullPath)) return

          const buffer = await fs.promises.readFile(fullPath)
          const bufferHash = generateHash(buffer)
          bufferHashMaps[imageName] = bufferHash

          if (Object.hasOwn(recipeMap, bufferHash)) {
            recipeMap[bufferHash].fileName = imageName
            return
          }
          const { width, height } = await getSize(fullPath)

          recipeMap[bufferHash] = {
            fileName: imageName,
            width,
            height,
            ratioWidth: getRatio(width, height),
            ratioHeight: getRatio(height, width),
            patternMap: {},
            usedPatternMap: {
              ...(recipeMap[bufferHash]?.usedPatternMap || {}),
            },
          }
        })
      )

      let parsedHtml = parseHtml(html)
      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

      if (!targetEls.length) return html

      for (const el of targetEls) {
        const tagName = el.tagName.toLowerCase()
        const isTarget = ["img", "source"].includes(tagName)

        let imageName = el.getAttribute(srcAttr).replace(/^\//, "")

        if (!isTarget || !imageName) continue

        if (imageName.startsWith("http")) {
          imageName = urlNameMap[imageName]
        }
        const bufferHash = bufferHashMaps[imageName]
        const recipe = recipeMap[bufferHash]
        const sizes = el.getAttribute("sizes") || ""
        const width = el.getAttribute("width") || ""
        const height = el.getAttribute("height") || ""
        const elAttrs = { sizes, width, height }
        const elOptimize = el.getAttribute(optimizeAttr) || "{}"
        const parsedOptimize = JSON.parse(elOptimize)
        const optimize = resolveOptimizeOption(parsedOptimize, recipe)
        const view = getView(optimize, recipe, elAttrs)
        const patternMap = getPatternMap(optimize, recipe, view, true)

        for (const [patternHash, pattern] of Object.entries(patternMap)) {
          recipe.patternMap[patternHash] = pattern
        }
        const attrs = getPatternAttrs(optimize, recipe, view, true)
        const prefixBase = base.replace(/\/$/, "")

        el.setAttribute("srcset", prefixBase + imageAlias + "/" + attrs.src)
        el.setAttribute("sizes", view.sizes)
        el.setAttribute("width", view.width.toString())
        el.setAttribute("height", view.height.toString())
        el.removeAttribute(targetAttr)
        el.removeAttribute(srcAttr)
        el.removeAttribute(optimizeAttr)

        if (tagName === "img") {
          el.setAttribute("src", prefixBase + imageAlias + "/" + attrs.src)
        }
      }

      await Promise.all(
        Object.values(recipeMap).map(async (recipe) => {
          await Promise.all(
            Object.entries(recipe.patternMap).map(
              async ([patternHash, imageCreate]) => {
                const inFullPath = path.resolve(rootDir, recipe.fileName)
                const outFullPath = path.resolve(imageDir, imageCreate.fileName)
                const outDir = path.dirname(outFullPath)
                const logPath = path.relative(rootDir, outFullPath)

                if (Object.hasOwn(recipe.usedPatternMap, patternHash)) {
                  delete recipe.patternMap[patternHash]
                  return
                }
                console.log(pc.gray(`[generate] ${logPath}`))

                const buffer = await runSharp(inFullPath, imageCreate)
                await fs.promises.mkdir(outDir, { recursive: true })
                await fs.promises.writeFile(outFullPath, buffer, "utf8")

                recipe.usedPatternMap[patternHash] = imageCreate
                delete recipe.patternMap[patternHash]
              }
            )
          )
        })
      )

      imageCache = { urlIndexMap, urlNameMap, recipeMap }

      await fs.promises.writeFile(
        imageCacheFile,
        JSON.stringify(imageCache, null, 2),
        "utf8"
      )
      return parsedHtml.toString()
    },
    transform(code, id) {
      if (![cpImagePath, cpPicturePath].includes(id)) return

      let newCode = code

      const { decoding, loading, optimize } = opts
      const regDecoding = /(const defaultDecoding = )"async"/
      const regLoading = /(const defaultLoading = )"eager"/
      const regOptimize = /(const defaultOptimize = )\{\}/
      const optimizeStr = "JSON.parse(`" + JSON.stringify(optimize) + "`)"

      newCode = newCode.replace(regDecoding, `$1"${decoding}"`)
      newCode = newCode.replace(regLoading, `$1"${loading}"`)
      newCode = newCode.replace(regOptimize, `$1${optimizeStr}`)

      return newCode
    },
  }
}
