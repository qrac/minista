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
  resolutions: number[]
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
export type ResolvedImageOptimize = Omit<
  ImageOptimize,
  "breakpoints" | "format"
> & {
  breakpoints: number[]
  format: ResolvedImageFormat
}

export type ImagesOptimize = {
  formats: ImageFormat[]
} & Omit<ImageOptimize, "format">
