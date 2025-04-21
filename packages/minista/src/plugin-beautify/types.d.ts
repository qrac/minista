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
  removeImagePreload: boolean
}
export type UserPluginOptions = Partial<PluginOptions>
