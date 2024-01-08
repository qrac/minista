import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

export type UserPluginOptions = {
  src?: string
  outName?: string
  format?: ArchiverFormat
  options?: ArchiverOptions
  ignore?: string[]
}

export type PluginOptions = {
  src: string
  outName: string
  format: ArchiverFormat
  options: ArchiverOptions
  ignore: string[]
}

export const defaultOptions: PluginOptions = {
  src: "dist",
  outName: "archive",
  format: "zip",
  options: { zlib: { level: 9 } },
  ignore: [],
}
