```ts
import type {
  JpegOptions,
  PngOptions,
  WebpOptions,
  AvifOptions,
  ResizeOptions,
} from "sharp"

type ImageOptimize = {
  layout: "constrained" | "fixed"
  breakpoints:
    | number[]
    | {
        count?: number
        minWidth?: number
        maxWidth?: number
      }
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

type ImageFormat = "inherit" | "jpg" | "png" | "webp" | "avif"
```
