import type { Config as SvgoConfig } from "svgo"

export type PluginOptions = {
  svgo?: SvgoConfig
}
export type UserPluginOptions = Partial<PluginOptions>

export const defaultOptions: PluginOptions = {}
