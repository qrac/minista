import type { Plugin, UserConfig } from "vite"
import type { OutputAsset } from "rollup"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fg from "fast-glob"
import pc from "picocolors"
import { parse as parseHtml } from "node-html-parser"

import type { SsgPage } from "minista-shared-utils"
import {
  checkDeno,
  getCwd,
  getPluginName,
  getRootDir,
  getTempDir,
  getBasedAssetPath,
  getAttrPaths,
  convertPathToEntryId,
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

export function pluginImageBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["image", "build"]
  const pluginName = getPluginName(names)
  const { useCache, remoteName } = opts
  const targetAttr = "data-minista-image"
  const srcAttr = "data-minista-image-src"
  const optimizeAttr = "data-minista-image-optimize"

  let isSsr = false
  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  let ssgPages: SsgPage[] = []
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
  let entries: { [key: string]: string } = {}
  let entryChangeMap: { [key: string]: string } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.join(tempDir, "ssg")
      imageDir = path.join(tempDir, "image")
      imageCacheFile = path.join(imageDir, "cache.json")

      if (!isSsr) {
        const ssgFiles = await fg(path.join(ssgDir, `*.mjs`))

        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const { ssgPages }: { ssgPages: SsgPage[] } = await import(file)
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
          const indexes = Object.values(imageCache.remotePathIndexMap) || []
          remotePathIndex = indexes.length ? Math.max(...indexes) : 0
          remotePathIndexMap = { ...imageCache.remotePathIndexMap }
          remotePathMap = { ...imageCache.remotePathMap }
          entryImageMap = { ...imageCache.entryImageMap }
        }

        let remotePaths: string[] = []
        let imagePaths: string[] = []

        for (const ssgPage of ssgPages) {
          const { html } = ssgPage
          remotePaths = [
            ...getAttrPaths(html, "img", srcAttr, "http"),
            ...getAttrPaths(html, "source", srcAttr, "http"),
          ]
          imagePaths = [
            ...getAttrPaths(html, "img", srcAttr, "/"),
            ...getAttrPaths(html, "source", srcAttr, "/"),
          ]
        }
        remotePaths = [...new Set(remotePaths)].sort()
        imagePaths = [...new Set(imagePaths), ...remotePaths].sort()

        for (const remotePath of remotePaths) {
          if (!remotePathIndexMap[remotePath]) {
            remotePathIndex = remotePathIndex + 1
            remotePathIndexMap[remotePath] = remotePathIndex
          }
        }
        await Promise.all(
          Object.entries(remotePathIndexMap).map(
            async ([remotePath, index]) => {
              if (useCache && imageCache.remotePathIndexMap[remotePath]) return

              console.log(pc.gray(`[download] ${remotePath}`))
              const remoteItem = await getRemote(remotePath, remoteName, index)

              if (!remoteItem) return

              const { fileName, data } = remoteItem
              const filePath = path.join(imageDir, fileName)
              await fs.promises.writeFile(filePath, data, "utf8")

              remotePathMap[remotePath] = filePath.replace(rootDir, "")
            }
          )
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

        for (const ssgPage of ssgPages) {
          const { html } = ssgPage
          const parsedHtml = parseHtml(html)
          const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

          if (!targetEls.length) continue

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
            const viewImage = getViewImage(
              resolvedOptimize,
              entryImage,
              elImage
            )
            const createImageMap = getCreateImageMap(
              resolvedOptimize,
              entryImage,
              viewImage
            )
            for (const [key, createImage] of Object.entries(createImageMap)) {
              entryImage.createImageMap[key] = createImage
            }
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
                  const entryId = convertPathToEntryId(output)

                  if (Object.hasOwn(entryImage.createdImageMap, key)) {
                    entries[entryId] = output
                    delete entryImage.createImageMap[key]
                    return
                  }
                  console.log(pc.gray(`[generate] ${logPath}`))

                  const buffer = await getSharpBuffer(input, createImage)
                  await fs.promises.writeFile(output, buffer, "utf8")

                  entries[entryId] = output
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
        return {
          build: {
            rollupOptions: {
              input: entries,
            },
          },
        } as UserConfig
      }
    },
    transform(code, id) {
      if (isSsr) {
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
      }
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        const beforeImages = Object.values(entries).map((item) => {
          return item.replace(imageDir, "").replace(/^[\/\\]/, "")
        })
        for (const before of beforeImages) {
          const afterImage = Object.values(bundle).find((item) => {
            return item.name === before && item.type === "asset"
          })
          if (afterImage) entryChangeMap[before] = afterImage.fileName
        }
        const htmlItems = Object.values(bundle).filter((item) => {
          return item.fileName.endsWith(".html") && item.type === "asset"
        }) as OutputAsset[]

        for (const item of htmlItems) {
          const htmlPath = item.fileName
          const html = item.source as string

          let parsedHtml = parseHtml(html)
          const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

          if (!targetEls.length) continue

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
            const viewImage = getViewImage(
              resolvedOptimize,
              entryImage,
              elImage
            )
            const attrs = getCreatedImageAttrs(
              resolvedOptimize,
              entryImage,
              viewImage
            )
            const srcset = Object.entries(attrs.srcset)
              .map(([key, before]) => {
                const after = entryChangeMap[before]
                const assetPath = getBasedAssetPath(base, htmlPath, after)
                return `${assetPath} ${key}`
              })
              .join(", ")
            el.setAttribute("srcset", srcset)
            el.setAttribute("sizes", viewImage.sizes)
            el.setAttribute("width", viewImage.width.toString())
            el.setAttribute("height", viewImage.height.toString())
            el.removeAttribute(targetAttr)
            el.removeAttribute(srcAttr)
            el.removeAttribute(optimizeAttr)

            if (tagName === "img") {
              const after = entryChangeMap[attrs.src]
              const assetPath = getBasedAssetPath(base, htmlPath, after)
              el.setAttribute("src", assetPath)
            }
            item.source = parsedHtml.toString()
          }
        }
      }
    },
  }
}
