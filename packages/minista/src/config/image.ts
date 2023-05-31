import type {
  JpegOptions,
  PngOptions,
  WebpOptions,
  AvifOptions,
  ResizeOptions,
} from "sharp"

export type ImageFormat = "inherit" | "jpg" | "png" | "webp" | "avif"
export type ResolvedImageFormat = Omit<ImageFormat, "inherit">

export type ImageOptimize = {
  layout: "constrained" | "fixed"
  breakpoints:
    | number[]
    | { count?: number; minWidth?: number; maxWidth?: number }
  resolution: number[]
  format: ImageFormat
  formatOptions: {
    jpg?: JpegOptions
    png?: PngOptions
    webp?: WebpOptions
    avif?: AvifOptions
  }
  quality?: number
  aspect?: string
  background?: ResizeOptions["background"]
  fit: ResizeOptions["fit"]
  position: ResizeOptions["position"]
}

export type ImagesOptimize = {
  formats: ImageFormat[]
} & Omit<ImageOptimize, "format">

export type ResolvedImageOptimize = ImageOptimize

export function resolveImageOptimize(
  base: ImageOptimize,
  inline: string | Partial<ImageOptimize>
): ResolvedImageOptimize {
  let inlineObj = {}

  if (typeof inline === "string" || !inline) {
    const inlineStr = inline.match(/^{.*}$/) ? inline : "{}"
    inlineObj = (JSON.parse(inlineStr) || {}) as Partial<ImageOptimize>
  } else {
    inlineObj = inline
  }
  let mergedOptimize = { ...base, ...inlineObj }
  let { formatOptions, quality } = mergedOptimize

  formatOptions = {
    jpg: { quality },
    png: { quality },
    webp: { quality },
    avif: { quality },
    ...formatOptions,
  }
  mergedOptimize.formatOptions = formatOptions

  return mergedOptimize
}
