import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"

export type UserPluginOptions = {
  src?: string[]
  htmlOptions?: HTMLBeautifyOptions
  cssOptions?: CSSBeautifyOptions
  jsOptions?: JSBeautifyOptions
}

export type PluginOptions = {
  src: string[]
  htmlOptions: HTMLBeautifyOptions
  cssOptions: CSSBeautifyOptions
  jsOptions: JSBeautifyOptions
}

export const defaultOptions: PluginOptions = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
    inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
  },
  cssOptions: {
    indent_size: 2,
    space_around_combinator: true,
  },
  jsOptions: {
    indent_size: 2,
  },
}
