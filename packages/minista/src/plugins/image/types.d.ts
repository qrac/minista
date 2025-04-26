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

export type ImagesOptimize = Omit<ImageOptimize, "format"> & {
  formats: ImageFormat[]
}

type PluginOptionBase = {
  useCache: boolean
  useSizeName: boolean
  remoteName: string
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

export type ImageCreate = {
  output: string
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

export type ImageEntry = {
  fileName: string
  width: number
  height: number
  ratioWidth: number
  ratioHeight: number
  imageCreateMap: { [createHash: string]: ImageCreate }
  imageCreatedMap: { [createHash: string]: ImageCreate }
}

export type RemoteUrlIndexMap = { [remoteUrl: string]: number }
export type RemoteNameMap = { [remoteUrl: string]: string }
export type ImageBufferHashMap = { [imageName: string]: string }
export type ImageEntryMap = { [bufferHash: string]: ImageEntry }
export type ImageCache = {
  remoteUrlIndexMap: RemoteUrlIndexMap
  remoteNameMap: RemoteNameMap
  imageEntryMap: ImageEntryMap
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
