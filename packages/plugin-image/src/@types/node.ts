import { ResolvedImageOptimize } from "./shared.js"

export * from "./shared.js"
export * from "../node/index.js"

export type EntryImage = {
  fileName: string
  width: number
  height: number
  ratioWidth: number
  ratioHeight: number
  createImageMap: { [key: string]: CreateImage }
  createdImageMap: { [key: string]: CreateImage }
}

export type ViewImage = {
  sizes: string
  width: number
  height: number
  ratioWidth: number
  ratioHeight: number
  changeAspect: boolean
}

export type CreateImage = {
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

export type ImageCache = {
  remotePathIndexMap: { [key: string]: number }
  remotePathMap: { [key: string]: string }
  entryImageMap: { [key: string]: EntryImage }
}
