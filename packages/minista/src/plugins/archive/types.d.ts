import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

export type SingleOptions = {
  srcDir: string
  outName: string
  ignore?: string | string[]
  format: ArchiverFormat
  options: ArchiverOptions
}
export type MultipleOptions = {
  srcDir: string
  outName: string
  ignore?: string | string[]
  format?: ArchiverFormat
  options?: ArchiverOptions
}

export type PluginOptions = SingleOptions & {
  multiple: MultipleOptions[]
}
export type UserPluginOptions = Partial<PluginOptions>
