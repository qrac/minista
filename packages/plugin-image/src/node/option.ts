import { deepmergeCustom } from "deepmerge-ts"

import type { ImageOptimize } from "../@types/node.js"

type PluginOptionBase = {
  useCache: boolean
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

export const defaultOptions: PluginOptions = {
  useCache: true,
  remoteName: "remote",
  decoding: "async",
  loading: "lazy",
  optimize: {
    layout: "constrained",
    breakpoints: [320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840],
    resolutions: [1, 2],
    format: "inherit",
    formatOptions: {},
    quality: undefined,
    aspect: undefined,
    background: undefined,
    fit: "cover",
    position: "centre",
  },
}

export function mergeOptions(
  option1: PluginOptions,
  option2: UserPluginOptions
): PluginOptions {
  const customDeepmerge = deepmergeCustom({
    mergeArrays: false,
  })
  return customDeepmerge(option1, option2) as PluginOptions
}
