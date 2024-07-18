import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"

type SingleOptions = {
  src: string
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
  src: "dist",
  outName: "archive",
  ignore: [],
  format: "zip",
  options: { zlib: { level: 9 } },
  multiple: [],
}

export function resolveMultipleOptions(opts: PluginOptions): SingleOptions[] {
  return [
    {
      src: opts.src,
      outName: opts.outName,
      ignore: opts.ignore,
      format: opts.format,
      options: opts.options,
    },
    ...opts.multiple.map((item) => ({
      src: item.src,
      outName: item.outName,
      ignore: item.ignore,
      format: item.format || opts.format,
      options: item.options || opts.options,
    })),
  ]
}
