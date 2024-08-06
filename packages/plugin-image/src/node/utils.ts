import path from "node:path"
import { createHash } from "node:crypto"
import { deepmerge } from "deepmerge-ts"
import imageSize from "image-size"
import sharp from "sharp"

import type {
  ImageOptimize,
  ResolvedImageOptimize,
  EntryImage,
  ViewImage,
  CreateImage,
} from "../@types/node.js"

export function getHash(input: string | Buffer) {
  const hash = createHash("sha256")
  hash.update(input)
  return hash.digest("hex")
}

export function getSize(fullPath: string) {
  const size = imageSize(fullPath)
  const width = size.width || 0
  const height = size.height || 0
  return { width, height }
}

export function getRatio(base: number, other: number) {
  return Math.round((base / other) * 10000) / 10000
}

export function resolveBreakpoints(
  breakpoints: ImageOptimize["breakpoints"],
  imageWidth: number
) {
  let result: number[] = []

  if (Array.isArray(breakpoints)) {
    result = breakpoints
      .filter((item) => item <= imageWidth)
      .sort((a, b) => a - b)
    return result
  }

  let { count = 1 } = breakpoints || {}
  let { minWidth = 320, maxWidth = 3840 } = breakpoints || {}

  maxWidth = imageWidth > maxWidth ? maxWidth : imageWidth

  if (count >= 2) {
    result.push(minWidth)
  }
  if (count >= 3) {
    const steps = count - 2
    const diff = maxWidth - minWidth

    for (let i = 1; i <= steps; i++) {
      const sep = i + 1
      const num = Math.round(minWidth + diff / sep)
      result.push(num)
    }
  }
  result.push(maxWidth)
  result = result.sort((a, b) => a - b)

  return result
}

export function resolveFormat(
  format: ImageOptimize["format"],
  ext: string
): ResolvedImageOptimize["format"] {
  return format === "inherit" ? ext : format
}

export function resolveFormatOptions(
  formatOptions: ImageOptimize["formatOptions"],
  quality?: ImageOptimize["quality"]
) {
  if (!quality) return formatOptions

  const sameQuality = {
    jpg: { quality },
    png: { quality },
    webp: { quality },
    avif: { quality },
  }
  return deepmerge(sameQuality, formatOptions)
}

export function resolveOptimize(
  optimize: ImageOptimize,
  entryImage: EntryImage
): ResolvedImageOptimize {
  const { fileName, width } = entryImage
  const ext = path.extname(fileName).replace(/^\./, "")
  return {
    ...optimize,
    breakpoints: resolveBreakpoints(optimize.breakpoints, width),
    format: resolveFormat(optimize.format, ext),
    formatOptions: resolveFormatOptions(
      optimize.formatOptions,
      optimize.quality
    ),
  }
}

export function getViewImage(
  resolvedOptimize: ResolvedImageOptimize,
  entryImage: EntryImage,
  elImage: { sizes: string; width: string; height: string }
) {
  let result: ViewImage = {
    sizes: elImage.sizes,
    width: Number(elImage.width) || 0,
    height: Number(elImage.height) || 0,
    ratioWidth: entryImage.ratioWidth,
    ratioHeight: entryImage.ratioHeight,
    changeAspect: false,
  }
  function floor2(num: number) {
    return Math.floor(num * 100) / 100
  }
  const { layout, aspect, breakpoints } = resolvedOptimize
  const autoSize = "__minista_image_auto_size"
  const isAutoSizes = elImage.sizes === autoSize
  const isAutoWidth = elImage.width === autoSize
  const isAutoHeight = elImage.height === autoSize

  if (aspect) {
    const regex = /^(\d+\.?\d*):(\d+\.?\d*)$/
    const aspectArray = aspect.match(regex) || ["1:1", "1", "1"]
    const aspectWidth = Number(aspectArray[1]) || 1
    const aspectHeight = Number(aspectArray[2]) || 1
    result.ratioWidth = getRatio(aspectWidth, aspectHeight)
    result.ratioHeight = getRatio(aspectHeight, aspectWidth)
  }
  if (isAutoWidth && isAutoHeight) {
    result.width = entryImage.width
    result.height = entryImage.height
  }
  if (isAutoWidth && !isAutoHeight) {
    result.width = Math.round(result.height * result.ratioWidth)
  }
  if (!isAutoWidth && isAutoHeight) {
    result.height = Math.round(result.width * result.ratioHeight)
  }
  if (!aspect) {
    result.ratioWidth = getRatio(result.width, result.height)
    result.ratioHeight = getRatio(result.height, result.width)
  }
  if (
    floor2(result.ratioWidth) !== floor2(entryImage.ratioWidth) ||
    floor2(result.ratioHeight) !== floor2(entryImage.ratioHeight)
  ) {
    result.changeAspect = true
  }
  if (isAutoSizes && layout === "constrained") {
    const maxBreakpoint = Math.max(...breakpoints)
    result.sizes = `(min-width: ${maxBreakpoint}px) ${maxBreakpoint}px, 100vw`
  }
  if (isAutoSizes && layout === "fixed") {
    result.sizes = `(min-width: ${result.width}px) ${result.width}px, 100vw`
  }
  return result
}

export function getCreateImageMap(
  resolvedOptimize: ResolvedImageOptimize,
  entryImage: EntryImage,
  viewImage: ViewImage,
  resizeOnly?: boolean
) {
  let result: { [key: string]: CreateImage } = {}

  const input = entryImage.fileName
  const name = path.parse(input).name
  const {
    layout,
    breakpoints,
    resolutions,
    format,
    formatOptions,
    background,
    fit,
    position,
  } = resolvedOptimize
  const resizeOptions = { background, fit, position }
  const maxBreakpoint = Math.max(...breakpoints)
  const maxResolution = Math.max(...resolutions)

  if (layout === "constrained") {
    if (resizeOnly) {
      const breakpoint = maxBreakpoint
      const width = breakpoint
      const height = Math.round(breakpoint * viewImage.ratioHeight)
      const output = `${name}-${width}x${height}.${format}`
      const createImage: CreateImage = {
        output,
        width,
        height,
        format,
        formatOptions,
        resizeOptions,
      }
      const createImageStr = JSON.stringify(createImage)
      const hash = getHash(createImageStr)
      result[hash] = createImage
      return result
    }
    for (const breakpoint of breakpoints) {
      const width = breakpoint
      const height = Math.round(breakpoint * viewImage.ratioHeight)
      const output = `${name}-${width}x${height}.${format}`
      const createImage: CreateImage = {
        output,
        width,
        height,
        format,
        formatOptions,
        resizeOptions,
      }
      const createImageStr = JSON.stringify(createImage)
      const hash = getHash(createImageStr)
      result[hash] = createImage
    }
    return result
  }

  if (layout === "fixed") {
    if (resizeOnly) {
      const resolution = maxResolution
      const width = Math.round(viewImage.width * resolution)
      const height = Math.round(viewImage.height * resolution)
      const output = `${name}-${width}x${height}.${format}`
      const createImage: CreateImage = {
        output,
        width,
        height,
        format,
        formatOptions,
        resizeOptions,
      }
      const createImageStr = JSON.stringify(createImage)
      const hash = getHash(createImageStr)
      result[hash] = createImage
      return result
    }
    for (const resolution of resolutions) {
      const width = Math.round(viewImage.width * resolution)
      const height = Math.round(viewImage.height * resolution)
      const output = `${name}-${width}x${height}.${format}`
      const createImage: CreateImage = {
        output,
        width,
        height,
        format,
        formatOptions,
        resizeOptions,
      }
      const createImageStr = JSON.stringify(createImage)
      const hash = getHash(createImageStr)
      result[hash] = createImage
    }
    return result
  }

  return result
}

export function getCreatedImageAttrs(
  resolvedOptimize: ResolvedImageOptimize,
  entryImage: EntryImage,
  viewImage: ViewImage,
  resizeOnly?: boolean
) {
  let result: { srcset: { [key: string]: string }; src: string } = {
    srcset: {},
    src: "",
  }
  const input = entryImage.fileName
  const name = path.parse(input).name
  const { layout, breakpoints, resolutions, format } = resolvedOptimize
  const maxBreakpoint = Math.max(...breakpoints)
  const maxResolution = Math.max(...resolutions)

  if (layout === "constrained") {
    if (resizeOnly) {
      const breakpoint = maxBreakpoint
      const width = breakpoint
      const height = Math.round(breakpoint * viewImage.ratioHeight)
      const output = `${name}-${width}x${height}.${format}`
      result.src = output
      return result
    }
    for (const breakpoint of breakpoints) {
      const width = breakpoint
      const height = Math.round(breakpoint * viewImage.ratioHeight)
      const output = `${name}-${width}x${height}.${format}`
      result.srcset[breakpoint + "w"] = output
      if (breakpoint === maxBreakpoint) result.src = output
    }
    return result
  }

  if (layout === "fixed") {
    if (resizeOnly) {
      const resolution = maxResolution
      const width = Math.round(viewImage.width * resolution)
      const height = Math.round(viewImage.height * resolution)
      const output = `${name}-${width}x${height}.${format}`
      result.src = output
      return result
    }
    for (const resolution of resolutions) {
      const width = Math.round(viewImage.width * resolution)
      const height = Math.round(viewImage.height * resolution)
      const output = `${name}-${width}x${height}.${format}`
      result.srcset[resolution + "x"] = output
      if (resolution === maxResolution) result.src = output
    }
    return result
  }
  return result
}

export async function getSharpBuffer(input: string, createImage: CreateImage) {
  const { width, height, format, formatOptions, resizeOptions } = createImage

  let image = sharp(input)
  image.resize(width, height, resizeOptions)

  switch (format) {
    case "jpg":
      image.jpeg({ ...formatOptions?.jpg })
      break
    case "png":
      image.png({ ...formatOptions?.png })
      break
    case "webp":
      image.webp({ ...formatOptions?.webp })
      break
    case "avif":
      image.avif({ ...formatOptions?.avif })
      break
  }
  return await image.toBuffer()
}
