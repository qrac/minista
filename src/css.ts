import path from "path"
import fs from "fs-extra"

import postcss from "postcss"
import postcssModules from "postcss-modules"

import type { Plugin } from "esbuild"
import type Less from "less"
import type Sass from "sass"
import type Stylus from "stylus"

import type { CssOptions } from "./types.js"

enum PreprocessLang {
  less = "less",
  sass = "sass",
  scss = "scss",
  styl = "styl",
  stylus = "stylus",
}
type CssLang = "css" | keyof typeof PreprocessLang
type PreprocessorTypes = {
  [PreprocessLang.less]: typeof Less
  [PreprocessLang.sass]: typeof Sass
  [PreprocessLang.scss]: typeof Sass
  [PreprocessLang.styl]: typeof Stylus
  [PreprocessLang.stylus]: typeof Stylus
}
type StylePreprocessor = (
  cssFullPath: string,
  options: CssOptions
) => Promise<string>

const PLUGIN = "esbuild-cssmodule-plugin"
const cssLangs = `\\.(css|less|sass|scss|styl|stylus)($|\\?)`
const cssLangRE = new RegExp(cssLangs)

async function loadPreprocessor<L extends PreprocessLang>(
  lang: L
): Promise<PreprocessorTypes[L]> {
  try {
    const preprocessor = await import(lang)
    return preprocessor.default
  } catch (e: any) {
    if (e.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        `Preprocessor dependency "${lang}" not found. Did you install it?`
      )
    } else {
      const error = new Error(
        `Preprocessor dependency "${lang}" failed to load:\n${e.message}`
      )
      error.stack = `${e.stack}\n${error.stack}`
      throw error
    }
  }
}

// .less
const less: StylePreprocessor = async (
  filepath: string,
  options: CssOptions
) => {
  const less = await loadPreprocessor(PreprocessLang.less)
  const content = await fs.readFile(filepath, "utf8")
  less.render("", {})
  const result = await less.render(content, {
    ...options.preprocessorOptions.less,
  })
  return result.css
}

// .scss / .sass
const scss: StylePreprocessor = async (
  scssFullPath: string,
  options: CssOptions
) => {
  const sass = await loadPreprocessor(PreprocessLang.sass)
  const result = await sass.compileAsync(scssFullPath, {
    ...options.preprocessorOptions.scss,
  })
  return result.css
}

// .styl / .stylus
const stylus: StylePreprocessor = async (
  filepath: string,
  options: CssOptions
) => {
  const stylus = await loadPreprocessor(PreprocessLang.stylus)
  const content = await fs.readFile(filepath, "utf8")
  const result = stylus(content, {
    ...options.preprocessorOptions.stylus,
  })
    .set("filename", filepath)
    .render()
  return result
}

const preProcessors = {
  [PreprocessLang.less]: less,
  [PreprocessLang.sass]: scss,
  [PreprocessLang.scss]: scss,
  [PreprocessLang.styl]: stylus,
  [PreprocessLang.stylus]: stylus,
}

async function buildCss(filepath: string, options: CssOptions) {
  const lang = filepath.match(cssLangRE)?.[1] as CssLang
  let css: string | undefined = undefined

  if (lang !== "css") {
    const preProcessor = preProcessors[lang]
    if (preProcessor) {
      css = await preProcessor(filepath, options)
    } else {
      console.warn(`${PLUGIN}: Unsupported CSS language: ${lang}`)
      return
    }
  } else {
    css = await fs.readFile(filepath, "utf8")
  }
  return css
}

async function buildJs(filepath: string, options: CssOptions) {
  const css = await buildCss(filepath, options)

  if (!css) return

  let cssModulesJSON = {}
  await postcss([
    postcssModules({
      ...options.modules,
      getJSON(_, json) {
        cssModulesJSON = json
        return cssModulesJSON
      },
    }),
  ]).process(css, {
    from: filepath,
    map: false,
  })

  const classNames = JSON.stringify(cssModulesJSON)

  return `export default ${classNames};`
}

export function CssModulePlugin(options: CssOptions): Plugin {
  const filter = new RegExp(`\\.module${cssLangs}`)
  return {
    name: PLUGIN,
    setup(build) {
      const results = new Map()
      build.onResolve({ filter, namespace: "file" }, async (args) => {
        if (!options.modules) return args
        const sourceFullPath = path.resolve(args.resolveDir, args.path)
        if (results.has(sourceFullPath)) return results.get(sourceFullPath)

        const content = await buildJs(sourceFullPath, options)
        const result = {
          path: args.path,
          namespace: PLUGIN,
          pluginData: {
            content,
          },
        }

        if (options.modules.cache) results.set(sourceFullPath, result)
        return result
      })

      build.onLoad({ filter, namespace: PLUGIN }, (args) => {
        if (!args.pluginData.content) return args
        return {
          contents: args.pluginData.content,
          loader: "js",
        }
      })
    },
  }
}
