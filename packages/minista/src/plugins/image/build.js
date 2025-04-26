/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').RemoteUrlIndexMap} RemoteUrlIndexMap */
/** @typedef {import('./types').RemoteNameMap} RemoteNameMap */
/** @typedef {import('./types').ImageBufferHashMap} ImageBufferHashMap */
/** @typedef {import('./types').ImageEntryMap} ImageEntryMap */
/** @typedef {import('./types').ImageCache} ImageCache */
/** @typedef {import('./types').ImageEntry} ImageEntry */
/** @typedef {import('../../plugins/ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
import pc from "picocolors"
import { normalizePath } from "vite"
import { parse as parseHtml } from "node-html-parser"

import { getRemote } from "./utils/remote.js"
import { resolveOptimize } from "./utils/optimize.js"
import { generateHash } from "./utils/hash.js"
import { getSize } from "./utils/size.js"
import { getRatio } from "./utils/ratio.js"
import { getImageView } from "./utils/view.js"
import { getImageCreateMap, getImageCreatedAttrs } from "./utils/create.js"
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
  const { useCache, useSizeName, remoteName } = opts
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
  let imageDir = ""
  let imageCacheFile = ""
  /** @type {ImageCache} */
  let imageCache = {
    remoteUrlIndexMap: {},
    remoteNameMap: {},
    imageEntryMap: {},
  }
  let remoteUrlIndex = 0
  /** @type {RemoteUrlIndexMap} */
  let remoteUrlIndexMap = {}
  /** @type {RemoteNameMap} */
  let remoteNameMap = {}
  /** @type {ImageBufferHashMap} */
  let imageBufferHashMaps = {}
  /** @type {ImageEntryMap} */
  let imageEntryMap = {}
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
      imageDir = path.resolve(tempDir, "image")
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

      await fs.promises.mkdir(imageDir, { recursive: true })

      if (useCache && fs.existsSync(imageCacheFile)) {
        imageCache = JSON.parse(
          await fs.promises.readFile(imageCacheFile, "utf8")
        )
      }
      if (useCache) {
        const indexes = Object.values(imageCache.remoteUrlIndexMap) || []
        remoteUrlIndex = indexes.length ? Math.max(...indexes) : 0
        remoteUrlIndexMap = { ...imageCache.remoteUrlIndexMap }
        remoteNameMap = { ...imageCache.remoteNameMap }
        imageEntryMap = { ...imageCache.imageEntryMap }
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
        if (!remoteUrlIndexMap[remoteUrl]) {
          remoteUrlIndex = remoteUrlIndex + 1
          remoteUrlIndexMap[remoteUrl] = remoteUrlIndex
        }
      }
      await Promise.all(
        Object.entries(remoteUrlIndexMap).map(async ([remoteUrl, index]) => {
          if (useCache && imageCache.remoteUrlIndexMap[remoteUrl]) return

          console.log(pc.gray(`[download] ${remoteUrl}`))
          const remoteItem = await getRemote(remoteUrl, remoteName, index)

          if (!remoteItem) return

          const { fileName, data } = remoteItem
          const fullPath = path.resolve(imageDir, fileName)
          await fs.promises.writeFile(fullPath, data, "utf8")

          remoteNameMap[remoteUrl] = normalizePath(
            path.relative(rootDir, fullPath)
          )
        })
      )

      await Promise.all(
        imageNames.map(async (imageName) => {
          if (imageName.startsWith("http")) {
            imageName = remoteNameMap[imageName]
          }
          if (!imageName) return

          const fullPath = path.resolve(rootDir, imageName)
          if (!fs.existsSync(fullPath)) return

          const buffer = await fs.promises.readFile(fullPath)
          const bufferHash = generateHash(buffer)
          imageBufferHashMaps[imageName] = bufferHash

          if (Object.hasOwn(imageEntryMap, bufferHash)) {
            imageEntryMap[bufferHash].fileName = imageName
            return
          }
          const { width, height } = await getSize(fullPath)
          imageEntryMap[bufferHash] = {
            fileName: imageName,
            width,
            height,
            ratioWidth: getRatio(width, height),
            ratioHeight: getRatio(height, width),
            imageCreateMap: {},
            imageCreatedMap: {
              ...(imageEntryMap[bufferHash]?.imageCreatedMap || {}),
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
            imageName = remoteNameMap[imageName]
          }
          const bufferHash = imageBufferHashMaps[imageName]
          const imageEntry = imageEntryMap[bufferHash]
          const sizes = el.getAttribute("sizes") || ""
          const width = el.getAttribute("width") || ""
          const height = el.getAttribute("height") || ""
          const elAttrs = { sizes, width, height }
          const elOptimize = el.getAttribute(optimizeAttr) || "{}"
          const optimize = JSON.parse(elOptimize)
          const resolvedOptimize = resolveOptimize(optimize, imageEntry)
          const imageView = getImageView(resolvedOptimize, imageEntry, elAttrs)
          const imageCreateMap = getImageCreateMap(
            resolvedOptimize,
            imageEntry,
            imageView,
            { useSizeName, resizeOnly: false }
          )
          for (const [createHash, imageCreate] of Object.entries(
            imageCreateMap
          )) {
            imageEntry.imageCreateMap[createHash] = imageCreate
          }
        }
      }

      await Promise.all(
        Object.values(imageEntryMap).map(async (imageEntry) => {
          await Promise.all(
            Object.entries(imageEntry.imageCreateMap).map(
              async ([createHash, imageCreate]) => {
                const inFullPath = path.resolve(rootDir, imageEntry.fileName)
                const outFullPath = path.resolve(imageDir, imageCreate.output)
                const logPath = path.relative(rootDir, outFullPath)
                const pathId = pathToId(outFullPath)

                if (Object.hasOwn(imageEntry.imageCreatedMap, createHash)) {
                  entries[pathId] = outFullPath
                  delete imageEntry.imageCreateMap[createHash]
                  return
                }
                console.log(pc.gray(`[generate] ${logPath}`))

                const buffer = await runSharp(inFullPath, imageCreate)
                await fs.promises.writeFile(outFullPath, buffer, "utf8")

                entries[pathId] = outFullPath
                imageEntry.imageCreatedMap[createHash] = imageCreate
                delete imageEntry.imageCreateMap[createHash]
              }
            )
          )
        })
      )

      imageCache = {
        remoteUrlIndexMap,
        remoteNameMap,
        imageEntryMap,
      }
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
        return path.relative(imageDir, item)
      })
      for (const before of beforeImages) {
        const afterImage = Object.values(outputAssets).find((item) => {
          return item.names.some((name) => name === before)
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
            imageName = remoteNameMap[remoteUrl]
          }
          const bufferHash = imageBufferHashMaps[imageName]
          const imageEntry = imageEntryMap[bufferHash]
          const sizes = el.getAttribute("sizes") || ""
          const width = el.getAttribute("width") || ""
          const height = el.getAttribute("height") || ""
          const elAttrs = { sizes, width, height }
          const elOptimize = el.getAttribute(optimizeAttr) || "{}"
          const optimize = JSON.parse(elOptimize)
          const resolvedOptimize = resolveOptimize(optimize, imageEntry)
          const imageView = getImageView(resolvedOptimize, imageEntry, elAttrs)
          const attrs = getImageCreatedAttrs(
            resolvedOptimize,
            imageEntry,
            imageView,
            { useSizeName, resizeOnly: false }
          )
          const srcset = Object.entries(attrs.srcset)
            .map(([key, before]) => {
              const after = entryChangeMap[before]
              const basedAssetUrl = getBasedAssetUrl(base, htmlName, after)
              return `${basedAssetUrl} ${key}`
            })
            .join(", ")
          el.setAttribute("srcset", srcset)
          el.setAttribute("sizes", imageView.sizes)
          el.setAttribute("width", imageView.width.toString())
          el.setAttribute("height", imageView.height.toString())
          el.removeAttribute(targetAttr)
          el.removeAttribute(srcAttr)
          el.removeAttribute(optimizeAttr)

          if (tagName === "img") {
            const after = entryChangeMap[attrs.src]
            const assetPath = getBasedAssetUrl(base, htmlName, after)
            el.setAttribute("src", assetPath)
          }
          item.source = parsedHtml.toString()
        }
      }
    },
  }
}
