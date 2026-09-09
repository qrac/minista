import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"

export type PluginOptions = {
  src: string[]
  htmlOptions: HTMLBeautifyOptions
  cssOptions: CSSBeautifyOptions
  jsOptions: JSBeautifyOptions
  /** @deprecated Move this option to pluginSsg. Explicit use reports MINISTA_BEAUTIFY_OPTION_MOVED. */
  removeImagePreload?: boolean
}
export type UserPluginOptions = Partial<PluginOptions>
