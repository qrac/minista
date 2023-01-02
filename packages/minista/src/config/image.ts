import type {
  JpegOptions,
  PngOptions,
  WebpOptions,
  AvifOptions,
  ResizeOptions,
} from "sharp"

export type ImageOptimize = {
  remoteName: string
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

export type ImageFormat = "inherit" | "jpg" | "png" | "webp" | "avif"
export type ResolvedImageFormat = "jpg" | "png" | "webp" | "avif"

export type ResolvedImageOptimize = ImageOptimize

export function resolveImageOptimize(
  imageConfig: ImageOptimize,
  inlineConfig: string
): ResolvedImageOptimize {
  let _inlineConfig = inlineConfig
  _inlineConfig = _inlineConfig.match(/^{.*}$/) ? _inlineConfig : "{}"

  const inlineObj = (JSON.parse(_inlineConfig) || {}) as Partial<ImageOptimize>
  return { ...imageConfig, ...inlineObj }
}
