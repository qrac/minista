import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pc from "picocolors"
import { parse as parseHtml } from "node-html-parser"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
  getAttrPaths,
} from "minista-shared-utils"

import type { ImageOptimize, EntryImage, ImageCache } from "../@types/node.js"
import type { PluginOptions } from "./option.js"
import { getRemote } from "./remote.js"
import {
  getHash,
  getSize,
  getRatio,
  resolveOptimize,
  getViewImage,
  getCreateImageMap,
  getCreatedImageAttrs,
  getSharpBuffer,
} from "./utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginImageServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["image", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const { useCache, remoteName } = opts
  const aliasImage = `/@${tempName}-image`
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"

  let rootDir = ""
  let tempDir = ""
  let imageDir = ""
  let imageCacheFile = ""
  let imageCache: ImageCache = {
    remotePathIndexMap: {},
    remotePathMap: {},
    entryImageMap: {},
  }
  let remotePathIndex = 0
  let remotePathIndexMap: { [key: string]: number } = {}
  let remotePathMap: { [key: string]: string } = {}
  let imageHashMaps: { [key: string]: string } = {}
  let entryImageMap: { [key: string]: EntryImage } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      imageDir = path.join(tempDir, "image")
      imageCacheFile = path.join(imageDir, "cache.json")

      await fs.promises.mkdir(imageDir, { recursive: true })
      return {
        resolve: {
          alias: [
            {
              find: aliasImage,
              replacement: imageDir,
            },
          ],
        },
      } as UserConfig
    },
    transform(code, id) {
      const componentPath = path.join(__dirname, "../", "client", "index.js")

      if (id === componentPath) {
        let newCode = code

        const { decoding, loading, optimize } = opts
        const regDecoding = /(const defaultDecoding = )"async"/
        const regLoading = /(const defaultLoading = )"lazy"/
        const regOptimize = /(const defaultOptimize = )\{\}/
        const optimizeStr = "JSON.parse(`" + JSON.stringify(optimize) + "`)"

        newCode = newCode.replace(regDecoding, `$1"${decoding}"`)
        newCode = newCode.replace(regLoading, `$1"${loading}"`)
        newCode = newCode.replace(regOptimize, `$1${optimizeStr}`)

        return newCode
      }
    },
    async transformIndexHtml(html) {
      if (useCache && fs.existsSync(imageCacheFile)) {
        imageCache = JSON.parse(
          await fs.promises.readFile(imageCacheFile, "utf8")
        )
      }
      if (useCache) {
        const indexes = Object.values(imageCache.remotePathIndexMap) || []
        remotePathIndex = indexes.length ? Math.max(...indexes) : 0
        remotePathIndexMap = { ...imageCache.remotePathIndexMap }
        remotePathMap = { ...imageCache.remotePathMap }
        entryImageMap = { ...imageCache.entryImageMap }
      }

      let remotePaths: string[] = []
      let imagePaths: string[] = []

      remotePaths = [
        ...getAttrPaths(html, "img", srcAttr, "http"),
        ...getAttrPaths(html, "source", srcAttr, "http"),
      ]
      imagePaths = [
        ...getAttrPaths(html, "img", srcAttr, "/"),
        ...getAttrPaths(html, "source", srcAttr, "/"),
      ]
      remotePaths = [...new Set(remotePaths)].sort()
      imagePaths = [...new Set(imagePaths), ...remotePaths].sort()

      for (const remotePath of remotePaths) {
        if (!remotePathIndexMap[remotePath]) {
          remotePathIndex = remotePathIndex + 1
          remotePathIndexMap[remotePath] = remotePathIndex
        }
      }
      await Promise.all(
        Object.entries(remotePathIndexMap).map(async ([remotePath, index]) => {
          if (useCache && imageCache.remotePathIndexMap[remotePath]) return

          console.log(pc.gray(`[download] ${remotePath}`))
          const remoteItem = await getRemote(remotePath, remoteName, index)

          if (!remoteItem) return

          const { fileName, data } = remoteItem
          const filePath = path.join(imageDir, fileName)
          await fs.promises.writeFile(filePath, data, "utf8")

          remotePathMap[remotePath] = filePath.replace(rootDir, "")
        })
      )

      await Promise.all(
        imagePaths.map(async (imagePath) => {
          if (imagePath.startsWith("http")) {
            imagePath = remotePathMap[imagePath]
          }
          if (!imagePath) return

          const fullPath = path.join(rootDir, imagePath)
          if (!fs.existsSync(fullPath)) return

          const buffer = await fs.promises.readFile(fullPath)
          const hash = getHash(buffer)
          imageHashMaps[imagePath] = hash

          if (Object.hasOwn(entryImageMap, hash)) {
            entryImageMap[hash].fileName = imagePath
            return
          }
          const { width, height } = getSize(fullPath)
          entryImageMap[hash] = {
            fileName: imagePath,
            width,
            height,
            ratioWidth: getRatio(width, height),
            ratioHeight: getRatio(height, width),
            createImageMap: {},
            createdImageMap: {
              ...(entryImageMap[hash]?.createdImageMap || {}),
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

        let imagePath = el.getAttribute(srcAttr)

        if (!isTarget || !imagePath) continue

        if (imagePath.startsWith("http")) {
          imagePath = remotePathMap[imagePath]
        }
        const hash = imageHashMaps[imagePath]
        const entryImage = entryImageMap[hash]
        const sizes = el.getAttribute("sizes") || ""
        const width = el.getAttribute("width") || ""
        const height = el.getAttribute("height") || ""
        const elImage = { sizes, width, height }
        const elOptimize = el.getAttribute(optimizeAttr) || "{}"
        const optimize: ImageOptimize = JSON.parse(elOptimize)
        const resolvedOptimize = resolveOptimize(optimize, entryImage)
        const viewImage = getViewImage(resolvedOptimize, entryImage, elImage)
        const createImageMap = getCreateImageMap(
          resolvedOptimize,
          entryImage,
          viewImage,
          true
        )
        for (const [key, createImage] of Object.entries(createImageMap)) {
          entryImage.createImageMap[key] = createImage
        }
        const attrs = getCreatedImageAttrs(
          resolvedOptimize,
          entryImage,
          viewImage,
          true
        )
        el.setAttribute("srcset", aliasImage + "/" + attrs.src)
        el.setAttribute("sizes", viewImage.sizes)
        el.setAttribute("width", viewImage.width.toString())
        el.setAttribute("height", viewImage.height.toString())
        el.removeAttribute(targetAttr)
        el.removeAttribute(srcAttr)
        el.removeAttribute(optimizeAttr)

        if (tagName === "img") {
          el.setAttribute("src", aliasImage + "/" + attrs.src)
        }
      }

      await Promise.all(
        Object.values(entryImageMap).map(async (entryImage) => {
          await Promise.all(
            Object.entries(entryImage.createImageMap).map(
              async ([key, createImage]) => {
                const input = path.join(rootDir, entryImage.fileName)
                const output = path.join(imageDir, createImage.output)
                const logPath = output.replace(rootDir, "")

                if (Object.hasOwn(entryImage.createdImageMap, key)) {
                  delete entryImage.createImageMap[key]
                  return
                }
                console.log(pc.gray(`[generate] ${logPath}`))

                const buffer = await getSharpBuffer(input, createImage)
                await fs.promises.writeFile(output, buffer, "utf8")

                entryImage.createdImageMap[key] = createImage
                delete entryImage.createImageMap[key]
              }
            )
          )
        })
      )

      imageCache = {
        remotePathIndexMap,
        remotePathMap,
        entryImageMap,
      }
      await fs.promises.writeFile(
        imageCacheFile,
        JSON.stringify(imageCache, null, 2),
        "utf8"
      )
      return parsedHtml.toString()
    },
  }
}
