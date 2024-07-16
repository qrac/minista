import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

type UserArchiveItem = {
  src?: string
  outName?: string
  format?: ArchiverFormat
  options?: ArchiverOptions
  ignore?: string[]
}

type ArchiveItem = {
  src: string
  outName: string
  format: ArchiverFormat
  options: ArchiverOptions
  ignore: string[]
}

export type UserPluginOptions = {
  archives?: ArchiveItem[]
}

export type PluginOptions = {
  archives: ArchiveItem[]
}

export const defaultArchiveItem: ArchiveItem = {
  src: "dist",
  outName: "archive",
  format: "zip",
  options: { zlib: { level: 9 } },
  ignore: [],
}

export const defaultOptions: PluginOptions = {
  archives: [defaultArchiveItem],
}

export function mergeArchiveItem(userItem: UserArchiveItem): ArchiveItem {
  return {
    ...defaultArchiveItem,
    ...userItem,
    options: { ...defaultArchiveItem.options, ...userItem.options },
  }
}
