import { deepmergeCustom } from "deepmerge-ts"

import type { MinistaConfig, MinistaUserConfig } from "./types.js"

export const defaultConfig: MinistaConfig = {
  base: "/",
  public: "public",
  src: "src",
  out: "dist",
  root: {
    srcDir: "",
    srcName: "root",
    srcExt: ["tsx", "jsx"],
  },
  pages: {
    srcDir: "pages",
    srcExt: ["tsx", "jsx", "md", "mdx"],
  },
  assets: {
    entry: "",
    srcDir: "assets",
    outDir: "assets",
    outName: "[name]",
    bundle: {
      outDir: "",
      outName: "bundle",
    },
    images: {
      useDownload: false,
      outDir: "images",
      outName: "[name]",
    },
    fonts: {
      outDir: "fonts",
      outName: "[name]",
    },
    icons: {
      useSprite: true,
      srcDir: "icons",
      outDir: "images",
      outName: "icons",
      svgstoreOptions: {
        cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
      },
    },
  },
  vite: {},
  markdown: {
    syntaxHighlighter: "highlight",
    highlightOptions: {},
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  },
  beautify: {
    useHtml: true,
    useCss: false,
    useJs: false,
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
    },
    cssOptions: {},
    jsOptions: {},
  },
}

export async function mergeConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaConfig> {
  const customDeepmerge = deepmergeCustom({
    mergeArrays: false,
  })
  const mergedConfig = customDeepmerge(
    defaultConfig,
    userConfig
  ) as MinistaConfig
  return mergedConfig
}

export async function getConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaConfig> {
  const mergedConfig = await mergeConfig(userConfig)
  return mergedConfig
}
