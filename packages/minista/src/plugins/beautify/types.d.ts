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
}
export type UserPluginOptions = Partial<PluginOptions>
