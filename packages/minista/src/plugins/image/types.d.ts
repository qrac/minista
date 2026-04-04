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
  outName: string
  remoteName: string
  layout: "constrained" | "fixed"
  breakpoints: number[] | { count: number; minWidth: number; maxWidth: number }
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
  fit: ResizeOptions["fit"]
  position: ResizeOptions["position"]
  background?: ResizeOptions["background"]
}
export type ResolvedImageOptimize = Omit<
  ImageOptimize,
  "breakpoints" | "format"
> & {
  breakpoints: number[]
  format: ResolvedImageFormat
}

export type ImagesOptimize = Omit<ImageOptimize, "format"> & {
  formats: ImageFormat[]
}

type PluginOptionBase = {
  useCache: boolean
  decoding: HTMLImageElement["decoding"]
  loading: HTMLImageElement["loading"]
}
export type PluginOptions = PluginOptionBase & {
  optimize: ImageOptimize
}
export type UserPluginOptions = Partial<PluginOptionBase> & {
  optimize?: Partial<ImageOptimize>
}

export type ImageView = {
  sizes: string
  width: number
  height: number
  ratioWidth: number
  ratioHeight: number
  changeAspect: boolean
}

export type ImagePattern = {
  fileName: string
  width: number
  height: number
  format: ResolvedImageOptimize["format"]
  formatOptions: ResolvedImageOptimize["formatOptions"]
  resizeOptions: {
    background: ResolvedImageOptimize["background"]
    fit: ResolvedImageOptimize["fit"]
    position: ResolvedImageOptimize["position"]
  }
}

export type ImageRecipe = {
  fileName: string
  width: number
  height: number
  ratioWidth: number
  ratioHeight: number
  patternMap: { [patternHash: string]: ImagePattern }
  usedPatternMap: { [patternHash: string]: ImagePattern }
}

export type UrlIndexMap = { [remoteUrl: string]: number }
export type UrlNameMap = { [remoteUrl: string]: string }
export type bufferHashMap = { [imageName: string]: string }
export type ImageRecipeMap = { [bufferHash: string]: ImageRecipe }
export type ImageCache = {
  urlIndexMap: UrlIndexMap
  urlNameMap: UrlNameMap
  recipeMap: ImageRecipeMap
}

type ArtDirective = {
  media: string
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
} & Partial<ImagesOptimize>

export type ImageProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
} & Partial<ImageOptimize> &
  React.HTMLAttributes<HTMLImageElement>

export type PictureProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
  artDirectives?: ArtDirective[]
} & Partial<ImagesOptimize> &
  React.HTMLAttributes<HTMLImageElement>
