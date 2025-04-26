/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').RemoteUrlIndexMap} RemoteUrlIndexMap */
/** @typedef {import('./types').RemoteNameMap} RemoteNameMap */
/** @typedef {import('./types').ImageBufferHashMap} ImageBufferHashMap */
/** @typedef {import('./types').ImageEntryMap} ImageEntryMap */
/** @typedef {import('./types').ImageCache} ImageCache */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
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
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { extractUrls } from "../../shared/url.js"
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
  const { useCache, useSizeName, remoteName } = opts
  const imageAlias = `/@${tempName}-image`
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"

  let rootDir = ""
  let tempDir = ""
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
  let imageBufferHashMap = {}
  /** @type {ImageEntryMap} */
  let imageEntryMap = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      imageDir = path.resolve(tempDir, "image")
      imageCacheFile = path.resolve(imageDir, "cache.json")

      await fs.promises.mkdir(imageDir, { recursive: true })
      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: imageAlias,
              replacement: imageDir,
            },
            {
              find: "minista/client",
              replacement: path.resolve(__dirname, "../../client.js"),
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
        const indexes = Object.values(imageCache.remoteUrlIndexMap) || []
        remoteUrlIndex = indexes.length ? Math.max(...indexes) : 0
        remoteUrlIndexMap = { ...imageCache.remoteUrlIndexMap }
        remoteNameMap = { ...imageCache.remoteNameMap }
        imageEntryMap = { ...imageCache.imageEntryMap }
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
          imageBufferHashMap[imageName] = bufferHash

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

      let parsedHtml = parseHtml(html)
      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

      if (!targetEls.length) return html

      for (const el of targetEls) {
        const tagName = el.tagName.toLowerCase()
        const isTarget = ["img", "source"].includes(tagName)

        let imageName = el.getAttribute(srcAttr).replace(/^\//, "")

        if (!isTarget || !imageName) continue

        if (imageName.startsWith("http")) {
          const remoteUrl = imageName
          imageName = remoteNameMap[remoteUrl]
        }
        const bufferHash = imageBufferHashMap[imageName]
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
          { useSizeName, resizeOnly: true }
        )
        for (const [createHash, imageCreate] of Object.entries(
          imageCreateMap
        )) {
          imageEntry.imageCreateMap[createHash] = imageCreate
        }
        const attrs = getImageCreatedAttrs(
          resolvedOptimize,
          imageEntry,
          imageView,
          { useSizeName, resizeOnly: true }
        )
        el.setAttribute("srcset", imageAlias + "/" + attrs.src)
        el.setAttribute("sizes", imageView.sizes)
        el.setAttribute("width", imageView.width.toString())
        el.setAttribute("height", imageView.height.toString())
        el.removeAttribute(targetAttr)
        el.removeAttribute(srcAttr)
        el.removeAttribute(optimizeAttr)

        if (tagName === "img") {
          el.setAttribute("src", imageAlias + "/" + attrs.src)
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

                if (Object.hasOwn(imageEntry.imageCreatedMap, createHash)) {
                  delete imageEntry.imageCreateMap[createHash]
                  return
                }
                console.log(pc.gray(`[generate] ${logPath}`))

                const buffer = await runSharp(inFullPath, imageCreate)
                await fs.promises.writeFile(outFullPath, buffer, "utf8")

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
      return parsedHtml.toString()
    },
    transform(code, id) {
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
  }
}
