import type { HTMLElement as NHTMLElement } from "node-html-parser"
import type { ResizeOptions } from "sharp"
import path from "node:path"
import { fetch } from "undici"
import fs from "fs-extra"
import pc from "picocolors"
import { extension, lookup } from "mime-types"
import imageSize from "image-size"
import sharp from "sharp"

import type { ResolvedConfig } from "../config/index.js"
import type {
  ResolvedImageOptimize,
  ResolvedImageFormat,
} from "../config/image.js"
import { resolveImageOptimize } from "../config/image.js"
import { resolveBase } from "../utility/base.js"
import { getRemoteFileName, getRemoteFileExtName } from "../utility/name.js"
import {
  resolveRelativeImagePath,
  isLocalPath,
  isRemotePath,
} from "../utility/path.js"

export type EntryImages = {
  [key: string]: EntryImage
}

type EntryImage = {
  fileName: string
  width: number
  height: number
  aspectWidth: number
  aspectHeight: number
}

type ViewImage = {
  width: string
  height: string
  sizes: string
  aspectWidth: number
  aspectHeight: number
  changeWidth: boolean
  changeHeight: boolean
}

export type CreateImages = {
  [key: string]: CreateImage
}

type CreateImage = {
  input: string
  width: number
  height: number
  resizeOptions: ResizeOptions
  format: ResolvedImageFormat
  formatOptions: ResolvedImageOptimize["formatOptions"]
}

export async function resolveRemoteImage({
  useBuild,
  url,
  config,
  optimize,
  entryImages,
}: {
  useBuild: boolean
  url: string
  config: ResolvedConfig
  optimize: ResolvedImageOptimize
  entryImages: EntryImages
}) {
  const { tempDir } = config.sub
  const outDir = path.join(tempDir, "images", "remote")

  const { remoteName } = optimize
  const remoteIndex =
    Object.values(entryImages).filter((item) =>
      item.fileName.startsWith(remoteName)
    ).length + 1

  let fileName = ""
  let extName = ""
  let contentType = ""

  if (useBuild) {
    const res = await fetch(url)

    if (!res.ok) {
      const message = pc.red("Unexpected response: " + res.statusText)
      console.error(`${pc.bold(pc.red("ERROR"))} ${message}`)
      return ""
    }

    if (!res.body) {
      const message = pc.red("Cannot detect file: " + res.statusText)
      console.error(`${pc.bold(pc.red("ERROR"))} ${message}`)
      return ""
    }

    contentType = res.headers.get("content-type") || ""

    extName = extension(contentType) || getRemoteFileExtName(url)
    extName = extName === "jpeg" ? "jpg" : extName

    fileName = getRemoteFileName(url)
    fileName = fileName || `${remoteName}-${remoteIndex}.${extName}`
    fileName = path.join(outDir, fileName)

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await fs.outputFile(fileName, buffer).catch((err) => {
      console.error(err)
    })
  } else {
    extName = getRemoteFileExtName(url)
    extName = extName === "jpeg" ? "jpg" : extName

    fileName = getRemoteFileName(url)
    fileName = fileName || `${remoteName}-${remoteIndex}.${extName}`
    fileName = path.join(outDir, fileName)
  }

  return fileName
}

export function resolveEntryImage(entry: EntryImage) {
  const size = imageSize(entry.fileName)

  entry.width = size.width || 0
  entry.height = size.height || 0

  entry.aspectWidth = Math.round((entry.width / entry.height) * 100) / 100
  entry.aspectWidth = !entry.aspectWidth ? 1 : entry.aspectWidth

  entry.aspectHeight = Math.round((entry.height / entry.width) * 100) / 100
  entry.aspectHeight = !entry.aspectHeight ? 1 : entry.aspectHeight

  return entry
}

export function resolveViewImage({
  view,
  entry,
  resolvedOptimize,
}: {
  view: ViewImage
  entry: EntryImage
  resolvedOptimize: ResolvedImageOptimize
}) {
  const { layout, aspect } = resolvedOptimize

  const autoSize = "__minista_image_auto_size"

  const isAutoWidth = view.width === autoSize
  const isAutoHeight = view.height === autoSize
  const isAutoSizes = view.sizes === autoSize

  if (aspect) {
    const regex = /^(\d+\.?\d*):(\d+\.?\d*)$/
    const aspectArray = aspect.match(regex) || ["1:1", "1", "1"]
    const aWidth = Number(aspectArray[1])
    const aHeight = Number(aspectArray[2])

    view.aspectWidth = Math.round((aWidth / aHeight) * 100) / 100
    view.aspectHeight = Math.round((aHeight / aWidth) * 100) / 100
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
    let width = Math.round(Number(view.height) * view.aspectWidth)
    view.width = width.toString()
    view.changeWidth = true
  }
  if (isAutoHeight && !isAutoWidth) {
    let height = Math.round(Number(view.width) * view.aspectHeight)
    view.height = height.toString()
    view.changeHeight = true
  }
  if (!isAutoWidth && !isAutoHeight) {
    view.aspectWidth =
      Math.round((Number(view.width) / Number(view.height)) * 100) / 100
    view.aspectHeight =
      Math.round((Number(view.height) / Number(view.width)) * 100) / 100
  }

  if (isAutoSizes && layout === "constrained") {
    view.sizes = `(min-width: ${entry.width}px) ${entry.width}px, 100vw`
  }
  if (isAutoSizes && layout === "fixed") {
    view.sizes = `(min-width: ${view.width}px) ${view.width}px, 100vw`
  }

  return view
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

export function resolveCreateImage({
  inputPath,
  width,
  height,
  outFormat,
  resolvedOptimize,
}: {
  inputPath: string
  width: number
  height: number
  outFormat: ResolvedImageFormat
  resolvedOptimize: ResolvedImageOptimize
}) {
  const { background, fit, position } = resolvedOptimize
  const resizeOptions = { background, fit, position }

  let { formatOptions, quality } = resolvedOptimize

  formatOptions = {
    jpg: {
      quality,
    },
    png: {
      quality,
    },
    webp: {
      quality,
    },
    avif: {
      quality,
    },
    ...formatOptions,
  }

  return {
    input: inputPath,
    width,
    height,
    resizeOptions,
    format: outFormat,
    formatOptions,
  } as CreateImage
}

export async function resolveServeImage({
  useBuild,
  entry,
  view,
  createImages,
  tempOutDir,
  resolvedOptimize,
  config,
}: {
  useBuild: boolean
  entry: EntryImage
  view: ViewImage
  createImages: CreateImages
  tempOutDir: string
  resolvedOptimize: ResolvedImageOptimize
  config: ResolvedConfig
}) {
  const { resolvedRoot } = config.sub
  const { format } = resolvedOptimize

  const parsedFileName = path.parse(entry.fileName)
  const name = parsedFileName.name
  const ext = parsedFileName.ext.replace(/^\./, "")
  const outFormat = resolveOutFormat(ext, format)

  let filePath = entry.fileName
  let width = 1
  let height = 1

  const isSameAspect = view.aspectHeight === entry.aspectHeight

  if (!isSameAspect) {
    width = entry.height * view.aspectWidth
    width = width > entry.width ? entry.width : width
    height = entry.width * view.aspectHeight
    height = height > entry.height ? entry.height : height

    const tempFileName = `${name}-${width}x${height}.${ext}`

    filePath = path.join(tempOutDir, tempFileName)
  }

  const hasCreateImage = Object.hasOwn(createImages, filePath)

  if (useBuild && !isSameAspect && !hasCreateImage) {
    await fs.ensureDir(tempOutDir)

    if (!fs.existsSync(filePath)) {
      const tempImage = sharp(entry.fileName)
      const { background, fit, position } = resolvedOptimize
      const resizeOptions = { background, fit, position }

      tempImage.resize(width, height, resizeOptions)

      await tempImage.toFile(filePath)
    }

    const createImage = resolveCreateImage({
      inputPath: filePath,
      outFormat,
      width,
      height,
      resolvedOptimize,
    })
    createImages[filePath] = createImage
  }

  filePath = filePath.replace(resolvedRoot, "")

  return { src: filePath, srcset: filePath }
}

export function resolveBuildImage({
  entry,
  view,
  createImages,
  resolvedOptimize,
  config,
}: {
  entry: EntryImage
  view: ViewImage
  createImages: CreateImages
  resolvedOptimize: ResolvedImageOptimize
  config: ResolvedConfig
}) {
  const { assets } = config.main
  const resolvedBase = resolveBase(config.main.base)
  const outDir = path.join(resolvedBase, assets.images.outDir)

  const { layout, format } = resolvedOptimize
  const { breakpoints, resolution } = resolvedOptimize

  const parsedFileName = path.parse(entry.fileName)
  const name = parsedFileName.name
  const ext = parsedFileName.ext.replace(/^\./, "")
  const outFormat = resolveOutFormat(ext, format)

  let src = ""
  let srcset: string[] = []

  if (layout === "constrained") {
    const resolvedBreakpoints = resolveBreakpoints(breakpoints, entry.width)

    srcset = resolvedBreakpoints.map((breakpoint) => {
      let width = breakpoint
      let height = Math.round(width * entry.aspectHeight)

      breakpoint >= entry.width && (width = entry.width)
      breakpoint >= entry.width && (height = entry.height)

      if (height > entry.height) {
        return ""
      }

      const createImage = resolveCreateImage({
        inputPath: entry.fileName,
        outFormat,
        width,
        height,
        resolvedOptimize,
      })
      let filePath = `${name}-${width}x${height}.${outFormat}`
      filePath = path.join(outDir, filePath)

      createImages[filePath] = createImage
      src = filePath
      return `${filePath} ${width}w`
    })

    srcset = srcset.filter((item) => item)
    srcset = [...new Set(srcset)]
  }

  if (layout === "fixed") {
    srcset = resolution.map((scale, index) => {
      const width = Number(view.width) * scale
      const height = Number(view.height) * scale

      const createImage = resolveCreateImage({
        inputPath: entry.fileName,
        outFormat,
        width,
        height,
        resolvedOptimize,
      })
      let filePath = `${name}-${width}x${height}.${outFormat}`
      filePath = path.join(outDir, filePath)

      createImages[filePath] = createImage

      index === 0 && (src = filePath)
      return `${filePath} ${scale}x`
    })
  }

  const srcsetStr = srcset.join(", ")

  return { src, srcset: srcsetStr, outFormat }
}

function cleanImage(el: NHTMLElement) {
  el.removeAttribute("data-minista-transform-target")
  el.removeAttribute("data-minista-image-src")
  el.removeAttribute("data-minista-image-optimize")
}

export async function transformEntryImages({
  command,
  parsedHtml,
  config,
  entryImages,
  createImages,
}: {
  command: "serve" | "build"
  parsedHtml: NHTMLElement
  config: ResolvedConfig
  entryImages: EntryImages
  createImages: CreateImages
}) {
  const { optimize } = config.main.assets.images
  const { resolvedRoot, tempDir } = config.sub

  const images = parsedHtml.querySelectorAll(
    `[data-minista-transform-target="image"]`
  )

  await Promise.all(
    images.map(async (el) => {
      const src = el.getAttribute("data-minista-image-src") || ""

      if (!src) {
        cleanImage(el)
        return
      }

      const optimizeAttr = "data-minista-image-optimize"
      const inlineOptimize = el.getAttribute(optimizeAttr) || "{}"
      const resolvedOptimize = resolveImageOptimize(optimize, inlineOptimize)

      const hasEntryImage = Object.hasOwn(entryImages, src)
      const isRemote = isRemotePath(src)

      let entry: EntryImage = {
        fileName: "",
        width: 0,
        height: 0,
        aspectWidth: 1,
        aspectHeight: 1,
      }

      let view: ViewImage = {
        width: el.getAttribute("width") || "",
        height: el.getAttribute("height") || "",
        sizes: el.getAttribute("sizes") || "",
        aspectWidth: 1,
        aspectHeight: 1,
        changeWidth: false,
        changeHeight: false,
      }

      if (hasEntryImage) {
        entry = entryImages[src]
      }

      if (!hasEntryImage && isRemote) {
        entry.fileName = await resolveRemoteImage({
          useBuild: true,
          url: src,
          config,
          optimize: resolvedOptimize,
          entryImages,
        })

        if (!entry.fileName) {
          cleanImage(el)
          return
        }
      }

      if (!hasEntryImage && !isRemote && isLocalPath(resolvedRoot, src)) {
        entry.fileName = path.join(resolvedRoot, src)
      }

      if (!hasEntryImage) {
        entry = resolveEntryImage(entry)
      }

      view = resolveViewImage({ view, entry, resolvedOptimize })

      view.changeWidth && el.setAttribute("width", view.width)
      view.changeHeight && el.setAttribute("height", view.height)
      el.setAttribute("sizes", view.sizes)

      const tagName = el.tagName.toLowerCase()

      if (command === "serve") {
        const tempOutDir = path.join(tempDir, "images", "serve")

        const serve = await resolveServeImage({
          useBuild: true,
          entry,
          view,
          createImages,
          tempOutDir,
          resolvedOptimize,
          config,
        })

        tagName === "img" && el.removeAttribute("srcset")
        tagName === "img" && el.setAttribute("src", serve.src)
        tagName === "source" && el.setAttribute("srcset", serve.srcset)
      }

      if (command === "build") {
        const build = resolveBuildImage({
          entry,
          view,
          createImages,
          resolvedOptimize,
          config,
        })

        if (
          (tagName === "source" && build.outFormat === "webp") ||
          (tagName === "source" && build.outFormat === "avif")
        ) {
          const type = lookup(build.outFormat) || ""
          el.setAttribute("type", type)
        }

        tagName === "img" && el.setAttribute("src", build.src)
        el.setAttribute("srcset", build.srcset)
      }

      if (!hasEntryImage) {
        entryImages[src] = entry
      }

      cleanImage(el)
      return
    })
  )

  return parsedHtml
}

export function transformRelativeImages({
  parsedHtml,
  pathname,
  config,
}: {
  parsedHtml: NHTMLElement
  pathname: string
  config: ResolvedConfig
}) {
  const { assets } = config.main

  const images = parsedHtml.querySelectorAll("img, source")
  const icons = parsedHtml.querySelectorAll("use")

  images.map((el) => {
    const src = el.getAttribute("src") || ""
    const srcset = el.getAttribute("srcset") || ""

    if (src) {
      const resolvedPath = resolveRelativeImagePath({
        pathname,
        replaceTarget: path.join("/", assets.images.outDir),
        assetPath: src,
      })
      if (src !== resolvedPath) {
        el.setAttribute("src", resolvedPath)
      }
    }

    if (srcset) {
      const resolvedPath = resolveRelativeImagePath({
        pathname,
        replaceTarget: path.join("/", assets.images.outDir),
        assetPath: srcset,
      })
      if (srcset !== resolvedPath) {
        el.setAttribute("srcset", resolvedPath)
      }
    }
    return
  })

  icons.map((el) => {
    const href = el.getAttribute("href") || ""

    if (href) {
      const resolvedPath = resolveRelativeImagePath({
        pathname,
        replaceTarget: path.join("/", assets.icons.outDir),
        assetPath: href,
      })
      if (href !== resolvedPath) {
        el.setAttribute("href", resolvedPath)
      }
    }
    return
  })

  return parsedHtml
}
