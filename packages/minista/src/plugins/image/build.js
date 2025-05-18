/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UrlIndexMap} UrlIndexMap */
/** @typedef {import('./types').UrlNameMap} UrlNameMap */
/** @typedef {import('./types').bufferHashMap} bufferHashMap */
/** @typedef {import('./types').ImageRecipeMap} ImageRecipeMap */
/** @typedef {import('./types').ImageCache} ImageCache */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
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
import { getPluginName } from "../../shared/name.js"
import { getRootDir, getTempDir, pathToId } from "../../shared/path.js"
import { extractUrls, getBasedAssetUrl } from "../../shared/url.js"
import { mergeAlias, filterOutputAssets } from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginImageBuild(opts) {
  const cwd = process.cwd()
  const names = ["image", "build"]
  const pluginName = getPluginName(names)
  const { useCache } = opts
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
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
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {{[before: string]: string}} */
  let entryChangeMap = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    async config(config) {
      isSsr = !!config.build?.ssr
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")
      remoteDir = path.resolve(tempDir, "remote")
      imageDir = path.resolve(tempDir, "image")
      imageDirStr = normalizePath(path.relative(rootDir, imageDir))
      imageCacheFile = path.resolve(imageDir, "cache.json")

      if (isSsr) {
        return {
          resolve: {
            alias: mergeAlias(config, [
              {
                find: "minista/client",
                replacement: path.resolve(__dirname, "../../client.js"),
              },
            ]),
          },
        }
      }

      const ssgFiles = await glob(path.resolve(ssgDir, `*.mjs`))

      if (!ssgFiles.length) return

      ssgPages = (
        await Promise.all(
          ssgFiles.map(async (file) => {
            const { ssgPages } = await import(path.resolve(cwd, file))
            return ssgPages
          })
        )
      ).flat()

      if (!ssgPages.length) return

      await fs.promises.mkdir(remoteDir, { recursive: true })
      await fs.promises.mkdir(imageDir, { recursive: true })

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

      /** @type {string[]} */
      let remoteUrls = []
      /** @type {string[]} */
      let imageNames = []

      for (const ssgPage of ssgPages) {
        const { html } = ssgPage
        remoteUrls = [
          ...remoteUrls,
          ...extractUrls(html, "img", srcAttr, "http"),
          ...extractUrls(html, "source", srcAttr, "http"),
        ]
        imageNames = [
          ...imageNames,
          ...extractUrls(html, "img", srcAttr, "/"),
          ...extractUrls(html, "source", srcAttr, "/"),
        ]
      }
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

      for (const ssgPage of ssgPages) {
        const { html } = ssgPage
        const parsedHtml = parseHtml(html)
        const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

        if (!targetEls.length) continue

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
          const patternMap = getPatternMap(optimize, recipe, view, false)

          for (const [patternHash, pattern] of Object.entries(patternMap)) {
            recipe.patternMap[patternHash] = pattern
          }
        }
      }

      await Promise.all(
        Object.values(recipeMap).map(async (recipe) => {
          await Promise.all(
            Object.entries(recipe.patternMap).map(
              async ([patternHash, pattern]) => {
                const inFullPath = path.resolve(rootDir, recipe.fileName)
                const outFullPath = path.resolve(imageDir, pattern.fileName)
                const outDir = path.dirname(outFullPath)
                const logPath = path.relative(rootDir, outFullPath)
                const pathId = pathToId(outFullPath)

                if (Object.hasOwn(recipe.usedPatternMap, patternHash)) {
                  entries[pathId] = outFullPath
                  delete recipe.patternMap[patternHash]
                  return
                }
                console.log(pc.gray(`[generate] ${logPath}`))

                const buffer = await runSharp(inFullPath, pattern)
                await fs.promises.mkdir(outDir, { recursive: true })
                await fs.promises.writeFile(outFullPath, buffer, "utf8")

                entries[pathId] = outFullPath
                recipe.usedPatternMap[patternHash] = pattern
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
      return {
        build: {
          rollupOptions: {
            input: entries,
          },
        },
      }
    },
    transform(code, id) {
      if (!isSsr) return

      const cpImagePath = path.resolve(__dirname, "components/image.js")
      const cpPicturePath = path.resolve(__dirname, "components/picture.js")

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
    generateBundle(options, bundle) {
      if (isSsr) return

      const outputAssets = filterOutputAssets(bundle)

      const beforeImages = Object.values(entries).map((item) => {
        return normalizePath(path.relative(rootDir, item))
      })
      for (const before of beforeImages) {
        const afterImage = Object.values(outputAssets).find((item) => {
          return item.originalFileNames.some((name) => name === before)
        })
        if (afterImage) entryChangeMap[before] = afterImage.fileName
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
          const tagName = el.tagName.toLowerCase()
          const isTarget = ["img", "source"].includes(tagName)

          let imageName = el.getAttribute(srcAttr).replace(/^\//, "")

          if (!isTarget || !imageName) continue

          if (imageName.startsWith("http")) {
            const remoteUrl = imageName
            imageName = urlNameMap[remoteUrl]
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
          const attrs = getPatternAttrs(optimize, recipe, view, false)
          const srcset = Object.entries(attrs.srcset)
            .map(([size, before]) => {
              const after = entryChangeMap[imageDirStr + "/" + before]
              const basedAssetUrl = getBasedAssetUrl(base, htmlName, after)
              return `${basedAssetUrl} ${size}`
            })
            .join(", ")
          el.setAttribute("srcset", srcset)
          el.setAttribute("sizes", view.sizes)
          el.setAttribute("width", view.width.toString())
          el.setAttribute("height", view.height.toString())
          el.removeAttribute(targetAttr)
          el.removeAttribute(srcAttr)
          el.removeAttribute(optimizeAttr)

          if (tagName === "img") {
            const after = entryChangeMap[attrs.src]
            const assetUrl = getBasedAssetUrl(base, htmlName, after)
            el.setAttribute("src", assetUrl)
          }
          item.source = parsedHtml.toString()
        }
      }
    },
  }
}
