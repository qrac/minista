/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import ('node-html-parser').HTMLElement} HTMLElement */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UrlIndexMap} UrlIndexMap */
/** @typedef {import('./types').UrlNameMap} UrlNameMap */
/** @typedef {import('./types').bufferHashMap} bufferHashMap */
/** @typedef {import('./types').ImageRecipeMap} ImageRecipeMap */
/** @typedef {import('./types').ImageCache} ImageCache */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
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
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  extractUrls,
  getServeBase,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import {
  mergeSsrNoExternal,
  mergeAlias,
  filterOutputAssets,
} from "../../shared/vite.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {PluginOptions} */
export const defaultOptions = {
  useCache: true,
  optimize: {
    outName: "[name]-[width]x[height]",
    remoteName: "remote-[index]",
    layout: "constrained",
    breakpoints: [320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840],
    resolutions: [1, 2],
    format: "inherit",
    formatOptions: {},
    quality: undefined,
    aspect: undefined,
    fit: "cover",
    position: "centre",
    background: undefined,
  },
  decoding: "async",
  loading: "eager",
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginImage(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const { useCache } = opts
  const cwd = process.cwd()
  const imageAlias = `/@__minista-image`
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"
  const cpImagePath = normalizePath(
    path.resolve(__dirname, "components/image.js"),
  )
  const cpPicturePath = normalizePath(
    path.resolve(__dirname, "components/picture.js"),
  )

  let isDev = false
  let isSsr = false
  let isBuild = false

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
  /** @type {string[]} */
  let remoteUrls = []
  /** @type {string[]} */
  let imageNames = []
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

  async function selfLoadCache() {
    if (useCache && fs.existsSync(imageCacheFile)) {
      imageCache = JSON.parse(
        await fs.promises.readFile(imageCacheFile, "utf8"),
      )
    }
    if (useCache) {
      const indexes = Object.values(imageCache.urlIndexMap) || []
      urlIndex = indexes.length ? Math.max(...indexes) : 0
      urlIndexMap = { ...imageCache.urlIndexMap }
      urlNameMap = { ...imageCache.urlNameMap }
      recipeMap = { ...imageCache.recipeMap }
    }
  }

  async function selfSaveCache() {
    await fs.promises.writeFile(
      imageCacheFile,
      JSON.stringify(imageCache, null, 2),
      "utf8",
    )
  }

  /**
   * @param {string[]} htmlArray
   */
  function selfUpdateUrlIndexMap(htmlArray) {
    for (const html of htmlArray) {
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
  }

  async function selfDownloadRemoteImages() {
    await Promise.all(
      Object.entries(urlIndexMap).map(async ([remoteUrl, index]) => {
        if (useCache && imageCache.urlIndexMap[remoteUrl]) return

        console.log(pc.gray(`[download] ${remoteUrl}`))
        const remoteItem = await getRemote(remoteUrl, "__r", index)

        if (!remoteItem) return

        const { fileName, data } = remoteItem
        const fullPath = path.resolve(remoteDir, fileName)
        await fs.promises.writeFile(fullPath, data, "utf8")

        urlNameMap[remoteUrl] = normalizePath(path.relative(rootDir, fullPath))
      }),
    )
  }

  async function selfUpdateRecipeMap() {
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
      }),
    )
  }

  /**
   * @param {HTMLElement} el
   */
  function selfGetElData(el) {
    const tagName = el.tagName.toLowerCase()
    const isTarget = ["img", "source"].includes(tagName)

    let imageName = el.getAttribute(srcAttr)?.replace(/^\//, "")

    if (!isTarget || !imageName) return {}

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
    return { tagName, optimize, recipe, view }
  }

  async function selfCreateImages() {
    await Promise.all(
      Object.values(recipeMap).map(async (recipe) => {
        await Promise.all(
          Object.entries(recipe.patternMap).map(
            async ([patternHash, pattern]) => {
              const inFullPath = path.resolve(rootDir, recipe.fileName)
              const outFullPath = path.resolve(imageDir, pattern.fileName)
              const outDir = path.dirname(outFullPath)
              const pathId = path.relative(rootDir, outFullPath)

              if (Object.hasOwn(recipe.usedPatternMap, patternHash)) {
                if (isBuild) entries[pathId] = outFullPath
                delete recipe.patternMap[patternHash]
                return
              }
              console.log(pc.gray(`[generate] ${normalizePath(pathId)}`))

              const buffer = await runSharp(inFullPath, pattern)
              await fs.promises.mkdir(outDir, { recursive: true })
              await fs.promises.writeFile(outFullPath, buffer, "utf8")

              if (isBuild) entries[pathId] = outFullPath
              recipe.usedPatternMap[patternHash] = pattern
              delete recipe.patternMap[patternHash]
            },
          ),
        )
      }),
    )
  }

  return {
    name: "vite-plugin:minista-image",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isSsr || isBuild
    },
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")
      remoteDir = path.resolve(tempDir, "remote")
      imageDir = path.resolve(tempDir, "image")
      imageDirStr = normalizePath(path.relative(rootDir, imageDir))
      imageCacheFile = path.resolve(imageDir, "cache.json")

      await fs.promises.mkdir(remoteDir, { recursive: true })
      await fs.promises.mkdir(imageDir, { recursive: true })

      if (isDev) {
        base = getServeBase(config.base || base)
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
          resolve: {
            alias: mergeAlias(config, [
              {
                find: imageAlias,
                replacement: normalizePath(imageDir),
              },
            ]),
          },
        }
      }
      if (isSsr) {
        return {
          ssr: {
            noExternal: mergeSsrNoExternal(config, ["minista"]),
          },
        }
      }
      if (isBuild) {
        base = getBuildBase(config.base || base)

        if (isSsr) return

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

        await selfLoadCache()

        const htmlArray = ssgPages.map((page) => page.html)
        selfUpdateUrlIndexMap(htmlArray)

        await selfDownloadRemoteImages()
        await selfUpdateRecipeMap()

        for (const html of htmlArray) {
          let parsedHtml = parseHtml(html)

          const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
          if (!targetEls.length) continue

          for (const el of targetEls) {
            const { optimize, recipe, view } = selfGetElData(el)
            if (!optimize || !recipe || !view) continue
            const patternMap = getPatternMap(optimize, recipe, view, false)

            for (const [patternHash, pattern] of Object.entries(patternMap)) {
              recipe.patternMap[patternHash] = pattern
            }
          }
        }
        await selfCreateImages()

        imageCache = { urlIndexMap, urlNameMap, recipeMap }
        await selfSaveCache()

        return {
          build: {
            rollupOptions: {
              input: entries,
            },
          },
        }
      }
    },
    async transformIndexHtml(html) {
      await selfLoadCache()

      const htmlArray = [html]
      selfUpdateUrlIndexMap(htmlArray)

      await selfDownloadRemoteImages()
      await selfUpdateRecipeMap()

      let parsedHtml = parseHtml(html)

      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
      if (!targetEls.length) return html

      for (const el of targetEls) {
        const { tagName, optimize, recipe, view } = selfGetElData(el)
        if (!optimize || !recipe || !view) continue
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
      await selfCreateImages()

      imageCache = { urlIndexMap, urlNameMap, recipeMap }
      await selfSaveCache()

      return parsedHtml.toString()
    },
    transform(code, id) {
      if (isBuild) return
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
          const { tagName, optimize, recipe, view } = selfGetElData(el)
          if (!optimize || !recipe || !view) continue
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
            const after = entryChangeMap[imageDirStr + "/" + attrs.src]
            const assetUrl = getBasedAssetUrl(base, htmlName, after)
            el.setAttribute("src", assetUrl)
          }
          item.source = parsedHtml.toString()
        }
      }
    },
  }
}
