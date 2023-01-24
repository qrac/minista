import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"
import { lookup } from "mime-types"
import imageSize from "image-size"

import type { ResolvedConfig } from "../config/index.js"
import type {
  ResolvedImageOptimize,
  ResolvedImageFormat,
} from "../config/image.js"
import type { EntryImages, CreateImages } from "../generate/image.js"
import { resolveImageOptimize } from "../config/image.js"
import { generateImageCache, generateTempImage } from "../generate/image.js"
import { getElements, cleanElement } from "../utility/element.js"
import { getUniquePaths } from "../utility/path.js"

type ViewImage = {
  width: string
  height: string
  sizes: string
  aspectWidth: number
  aspectHeight: number
  changeWidth: boolean
  changeHeight: boolean
}

const cleanAttributes = [
  "data-minista-transform-target",
  "data-minista-image-src",
  "data-minista-image-outname",
  "data-minista-image-optimize",
]

export async function getImageSize(fileName: string) {
  if (!(await fs.pathExists(fileName))) {
    return { width: 0, height: 0 }
  }
  const size = imageSize(fileName)
  return { width: size.width || 0, height: size.height || 0 }
}

export function getImageAspect(base: number | string, other: number | string) {
  const _base: number = Number(base)
  const _other: number = Number(other)
  return Math.round((_base / _other) * 100) / 100
}

export function getImageAspects(
  width: number | string,
  height: number | string,
  aspect?: string
) {
  let aspectWidth: number
  let aspectHeight: number

  if (aspect) {
    const regex = /^(\d+\.?\d*):(\d+\.?\d*)$/
    const aspectArray = aspect.match(regex) || ["1:1", "1", "1"]
    width = aspectArray[1]
    height = aspectArray[2]
  }
  aspectWidth = getImageAspect(width, height)
  aspectWidth = !aspectWidth ? 1 : aspectWidth

  aspectHeight = getImageAspect(height, width)
  aspectHeight = !aspectHeight ? 1 : aspectHeight

  return { aspectWidth, aspectHeight }
}

export function getImageLength(
  otherLength: number | string,
  baseAspect: number
) {
  const _otherLength: number = Number(otherLength)
  return Math.round(_otherLength * baseAspect)
}

export function resolveOutFormat(
  ext: string,
  format: ResolvedImageOptimize["format"]
) {
  let outFormat: ResolvedImageFormat = "jpg"

  if (format === "inherit") {
    ext === "png" && (outFormat = "png")
    ext === "webp" && (outFormat = "webp")
    ext === "avif" && (outFormat = "avif")
  } else {
    outFormat = format
  }
  return outFormat
}

export function resolveBreakpoints(
  breakpoints: ResolvedImageOptimize["breakpoints"],
  imageWidth: number
) {
  if (Array.isArray(breakpoints)) {
    return breakpoints.sort((a, b) => a - b)
  }

  let _breakpoints: number[] = []
  let { count = 1 } = breakpoints || {}
  let { minWidth = 320, maxWidth = 3840 } = breakpoints || {}

  maxWidth = imageWidth > maxWidth ? maxWidth : imageWidth

  if (count >= 2) {
    _breakpoints.push(minWidth)
  }

  if (count >= 3) {
    const steps = count - 2
    const diff = maxWidth - minWidth

    for (let i = 1; i <= steps; i++) {
      const sep = i + 1
      const num = Math.round(minWidth + diff / sep)

      _breakpoints.push(num)
    }
  }
  _breakpoints.push(maxWidth)
  _breakpoints = _breakpoints.sort((a, b) => a - b)

  return _breakpoints
}

export async function transformImages({
  command,
  parsedData,
  config,
  createImages,
}: {
  command: "build" | "serve"
  parsedData: NHTMLElement | NHTMLElement[]
  config: ResolvedConfig
  createImages?: CreateImages
}) {
  const targetAttr = `[data-minista-transform-target="image"]`
  const targetEls = getElements(parsedData, targetAttr)

  if (!targetEls.length) {
    return
  }
  const { resolvedRoot, resolvedBase, tempDir } = config.sub
  const { outDir, optimize } = config.main.assets.images
  const cacheDir = path.join(tempDir, "images", "serve")
  const cacheJson = path.join(tempDir, "images", "image-cache.json")

  let cacheData: EntryImages = {}

  if (command === "serve") {
    if (await fs.pathExists(cacheJson)) {
      cacheData = await fs.readJSON(cacheJson)
    }
  }

  const targetList = targetEls.map((el) => {
    return {
      el,
      tagName: el.tagName.toLowerCase(),
      src: el.getAttribute("data-minista-image-src") || "",
      outName: el.getAttribute("data-minista-image-outname") || "",
      optimize: resolveImageOptimize(
        optimize,
        el.getAttribute("data-minista-image-optimize") || "{}"
      ),
      width: el.getAttribute("width") || "",
      height: el.getAttribute("height") || "",
      sizes: el.getAttribute("sizes") || "",
    }
  })

  const targetSrcs = getUniquePaths(
    targetList.map((item) => item.src),
    Object.keys(cacheData)
  )

  await Promise.all(
    targetSrcs.map(async (src) => {
      const fileName = path.join(resolvedRoot, src)
      const { width, height } = await getImageSize(fileName)
      const { aspectWidth, aspectHeight } = getImageAspects(width, height)

      cacheData[src] = {
        fileName,
        width,
        height,
        aspectWidth,
        aspectHeight,
      }
      return
    })
  )

  await Promise.all(
    targetList.map(async (item) => {
      const { tagName, el } = item
      const entry = cacheData[item.src]

      const { layout, aspect } = item.optimize
      const { resolution, breakpoints } = item.optimize
      const { format, formatOptions } = item.optimize
      const { background, fit, position } = item.optimize
      const resizeOptions = { background, fit, position }

      const parsedFileName = path.parse(entry.fileName)
      const name = parsedFileName.name
      const ext = parsedFileName.ext.replace(/^\./, "")
      const outFormat = resolveOutFormat(ext, format)

      let view: ViewImage = {
        width: item.width,
        height: item.height,
        sizes: item.sizes,
        aspectWidth: 1,
        aspectHeight: 1,
        changeWidth: false,
        changeHeight: false,
      }
      const autoSize = "__minista_image_auto_size"
      const isAutoWidth = view.width === autoSize
      const isAutoHeight = view.height === autoSize
      const isAutoSizes = view.sizes === autoSize

      if (aspect) {
        const { aspectWidth, aspectHeight } = getImageAspects(0, 0, aspect)
        view.aspectWidth = aspectWidth
        view.aspectHeight = aspectHeight
      } else {
        view.aspectWidth = entry.aspectWidth
        view.aspectHeight = entry.aspectHeight
      }
      if (isAutoWidth && isAutoHeight) {
        view.width = entry.width.toString()
        view.height = entry.height.toString()
        view.changeWidth = true
        view.changeHeight = true
      }
      if (isAutoWidth && !isAutoHeight) {
        let width = getImageLength(view.height, view.aspectWidth)
        view.width = width.toString()
        view.changeWidth = true
      }
      if (isAutoHeight && !isAutoWidth) {
        let height = getImageLength(view.width, view.aspectHeight)
        view.height = height.toString()
        view.changeHeight = true
      }
      if (!isAutoWidth && !isAutoHeight) {
        view.aspectWidth = getImageAspect(view.width, view.height)
        view.aspectHeight = getImageAspect(view.height, view.width)
      }
      if (isAutoSizes && layout === "constrained") {
        view.sizes = `(min-width: ${entry.width}px) ${entry.width}px, 100vw`
      }
      if (isAutoSizes && layout === "fixed") {
        view.sizes = `(min-width: ${view.width}px) ${view.width}px, 100vw`
      }
      view.changeWidth && el.setAttribute("width", view.width)
      view.changeHeight && el.setAttribute("height", view.height)
      el.setAttribute("sizes", view.sizes)

      if (command === "serve") {
        let fileName = entry.fileName
        let filePath = fileName.replace(resolvedRoot, "")

        if (view.aspectHeight !== entry.aspectHeight) {
          let width = 1
          let height = 1

          width = entry.height * view.aspectWidth
          width = width > entry.width ? entry.width : width
          height = entry.width * view.aspectHeight
          height = height > entry.height ? entry.height : height

          const tempFileName = `${name}-${width}x${height}.${ext}`

          fileName = path.join(cacheDir, tempFileName)
          filePath = fileName.replace(resolvedRoot, "")

          if (!(await fs.pathExists(fileName))) {
            const createImage = {
              input: entry.fileName,
              width,
              height,
              resizeOptions,
              format: outFormat,
              formatOptions,
            }
            await generateTempImage({ fileName, filePath, createImage })
          }
        }
        tagName === "img" && el.removeAttribute("srcset")
        tagName === "img" && el.setAttribute("src", filePath)
        tagName === "source" && el.setAttribute("srcset", filePath)
      }

      if (command === "build") {
        let src = ""
        let srcset = ""
        let srcsetArray: string[] = []

        if (layout === "constrained") {
          const resolvedBreakpoints = resolveBreakpoints(
            breakpoints,
            entry.width
          )
          srcsetArray = resolvedBreakpoints.map((breakpoint) => {
            let width = breakpoint
            let height = Math.round(width * entry.aspectHeight)

            breakpoint >= entry.width && (width = entry.width)
            breakpoint >= entry.width && (height = entry.height)

            if (height > entry.height) {
              return ""
            }
            const createImage = {
              input: entry.fileName,
              width,
              height,
              resizeOptions,
              format: outFormat,
              formatOptions,
            }
            let fileName = `${name}-${width}x${height}.${outFormat}`
            fileName = path.join(outDir, fileName)

            createImages && (createImages[fileName] = createImage)

            const filePath = path.join(resolvedBase, fileName)

            src = filePath
            return `${filePath} ${width}w`
          })
          srcsetArray = srcsetArray.filter((item) => item)
          srcsetArray = [...new Set(srcsetArray)]
        }

        if (layout === "fixed") {
          srcsetArray = resolution.map((scale, index) => {
            const width = Number(view.width) * scale
            const height = Number(view.height) * scale

            const createImage = {
              input: entry.fileName,
              width,
              height,
              resizeOptions,
              format: outFormat,
              formatOptions,
            }
            let fileName = `${name}-${width}x${height}.${outFormat}`
            fileName = path.join(outDir, fileName)

            createImages && (createImages[fileName] = createImage)

            const filePath = path.join(resolvedBase, fileName)

            index === 0 && (src = filePath)
            return `${filePath} ${scale}x`
          })
        }
        srcset = srcsetArray.join(", ")

        if (tagName === "source" && outFormat.match(/webp|avif/)) {
          const formatStr = outFormat as string
          const type = lookup(formatStr) || ""
          type && el.setAttribute("type", type)
        }
        tagName === "img" && el.setAttribute("src", src)
        el.setAttribute("srcset", srcset)
      }

      cleanElement(el, cleanAttributes)
      return
    })
  )

  if (command === "serve" && targetSrcs.length > 0) {
    await generateImageCache(cacheJson, cacheData)
  }
}
