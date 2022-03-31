import { deepmergeCustom } from "deepmerge-ts"

import type {
  MinistaConfig,
  MinistaUserConfig,
  MinistaResolveConfig,
} from "./types.js"

import { systemConfig } from "./system.js"
import { slashEnd, noSlashEnd } from "./utils.js"

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

export async function resolveConfig(
  config: MinistaConfig
): Promise<MinistaResolveConfig> {
  const resolvedConfig = {
    ...config,
    rootSrcDir: slashEnd(config.src) + noSlashEnd(config.root.srcDir),
    pagesSrcDir: slashEnd(config.src) + noSlashEnd(config.pages.srcDir),
    publicOutDir: slashEnd(config.out) + noSlashEnd(config.base),
    pagesOutDir: slashEnd(config.out) + noSlashEnd(config.base),
    assetsOutHref: slashEnd(config.base) + noSlashEnd(config.assets.outDir),
    viteAssetsOutput:
      slashEnd(config.assets.outDir) +
      noSlashEnd(config.assets.outName) +
      ".[ext]",
    viteAssetsImagesOutput:
      slashEnd(config.assets.outDir) +
      slashEnd(config.assets.images.outDir) +
      noSlashEnd(config.assets.images.outName) +
      ".[ext]",
    viteAssetsFontsOutput:
      slashEnd(config.assets.outDir) +
      slashEnd(config.assets.fonts.outDir) +
      noSlashEnd(config.assets.fonts.outName) +
      ".[ext]",
    vitePluginSvgSpriteIconsSrcDir:
      slashEnd(config.src) +
      slashEnd(config.assets.srcDir) +
      noSlashEnd(config.assets.icons.srcDir),
    vitePluginSvgSpriteIconsOutput:
      slashEnd(config.base) +
      slashEnd(config.assets.outDir) +
      slashEnd(config.assets.icons.outDir) +
      noSlashEnd(config.assets.icons.outName) +
      ".svg",
    vitePluginSvgSpriteIconsTempOutput:
      slashEnd(systemConfig.temp.icons.outDir) +
      slashEnd(config.assets.outDir) +
      slashEnd(config.assets.icons.outDir) +
      noSlashEnd(config.assets.icons.outName) +
      ".svg",
  }
  return resolvedConfig
}

export async function getConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaResolveConfig> {
  const mergedConfig = await mergeConfig(userConfig)
  const resolvedConfig = await resolveConfig(mergedConfig)
  return resolvedConfig
}
