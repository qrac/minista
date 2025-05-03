import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

export type ArchiveOptions = {
  srcDir: string
  outName: string
  ignore?: string | string[]
  format?: ArchiverFormat
  options?: ArchiverOptions
}

export type PluginOptions = {
  archives: ArchiveOptions[]
}
export type UserPluginOptions = Partial<PluginOptions>
