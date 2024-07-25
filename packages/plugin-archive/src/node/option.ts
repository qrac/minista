import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

type SingleOptions = {
  srcDir: string
  outName: string
  ignore?: string | string[]
  format: ArchiverFormat
  options: ArchiverOptions
}

export type UserPluginOptions = {
  multiple?: SingleOptions[]
} & Partial<SingleOptions>

export type PluginOptions = {
  multiple: SingleOptions[]
} & SingleOptions

export const defaultOptions: PluginOptions = {
  srcDir: "dist",
  outName: "dist",
  ignore: [],
  format: "zip",
  options: { zlib: { level: 9 } },
  multiple: [],
}

export function resolveMultipleOptions(opts: PluginOptions): SingleOptions[] {
  return [
    {
      srcDir: opts.srcDir,
      outName: opts.outName,
      ignore: opts.ignore,
      format: opts.format,
      options: opts.options,
    },
    ...opts.multiple.map((item) => ({
      srcDir: item.srcDir,
      outName: item.outName,
      ignore: item.ignore,
      format: item.format || opts.format,
      options: item.options || opts.options,
    })),
  ]
}
