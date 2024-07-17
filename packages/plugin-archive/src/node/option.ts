import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

type UserArchiveItem = {
  src: string
  outName: string
  ignore?: string | string[]
}

type ArchiveItem = {
  src: string
  outName: string
  ignore?: string | string[]
}

export type UserPluginOptions = {
  items?: UserArchiveItem[]
  format?: ArchiverFormat
  options?: ArchiverOptions
}

export type PluginOptions = {
  items: ArchiveItem[]
  format: ArchiverFormat
  options: ArchiverOptions
}

export const defaultArchiveItem: ArchiveItem = {
  src: "dist",
  outName: "archive",
  ignore: [],
}

export const defaultOptions: PluginOptions = {
  items: [defaultArchiveItem],
  format: "zip",
  options: { zlib: { level: 9 } },
}
