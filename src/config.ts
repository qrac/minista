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
  out: "dist",
  root: {
    srcDir: "src",
    srcName: "root",
    srcExt: ["tsx", "jsx"],
  },
  pages: {
    srcDir: "src/pages",
    srcExt: ["tsx", "jsx", "md", "mdx"],
  },
  assets: {
    entry: "",
    outDir: "assets",
    outName: "[name]",
    bundle: {
      outName: "bundle",
    },
    partial: {
      usePreact: false,
      useIntersectionObserver: true,
      outName: "partial",
      rootAttrSuffix: "partial-hydration",
      rootValuePrefix: "ph",
      rootDOMElement: "div",
      rootStyle: { display: "contents" },
      intersectionObserverOptions: {
        root: null,
        rootMargin: "0px",
        thresholds: [1],
      },
    },
    images: {
      outDir: "assets/images",
      outName: "[name]",
    },
    fonts: {
      outDir: "assets/fonts",
      outName: "[name]",
    },
    svgr: {
      svgrOptions: {},
    },
    icons: {
      useSprite: true,
      srcDir: "src/assets/icons",
      outDir: "assets/images",
      outName: "icons",
      svgstoreOptions: {
        cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
      },
    },
    download: {
      useRemote: false,
      remoteUrl: ["https://", "http://"],
      remoteName: "remote-[index]",
      outDir: "assets/images",
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
    useAssets: false,
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
      inline: ["span", "b", "br", "code", "del", "s", "small", "strong", "wbr"],
    },
    cssOptions: {},
    jsOptions: {},
  },
  css: {
    modules: {
      generateScopedName: undefined,
      globalModulePaths: [],
      hashPrefix: "",
      localsConvention: "camelCaseOnly",
      scopeBehaviour: "local",
      cache: true,
    },
    preprocessorOptions: {
      scss: {},
      less: {},
      stylus: {},
    },
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
    rootSrcDir: noSlashEnd(config.root.srcDir),
    pagesSrcDir: noSlashEnd(config.pages.srcDir),
    publicOutDir: noSlashEnd(config.out),
    pagesOutDir: noSlashEnd(config.out),
    assetsOutHref: slashEnd(config.base) + noSlashEnd(config.assets.outDir),
    downloadOutDir:
      slashEnd(config.out) + noSlashEnd(config.assets.download.outDir),
    downloadOutHref:
      slashEnd(config.base) + noSlashEnd(config.assets.download.outDir),
    viteAssetsOutput:
      slashEnd(config.assets.outDir) +
      noSlashEnd(config.assets.outName) +
      ".[ext]",
    viteAssetsImagesOutput:
      slashEnd(config.assets.images.outDir) +
      noSlashEnd(config.assets.images.outName) +
      ".[ext]",
    viteAssetsFontsOutput:
      slashEnd(config.assets.fonts.outDir) +
      noSlashEnd(config.assets.fonts.outName) +
      ".[ext]",
    vitePluginSvgSpriteIconsSrcDir: noSlashEnd(config.assets.icons.srcDir),
    vitePluginSvgSpriteIconsOutput:
      slashEnd("/") +
      slashEnd(config.assets.icons.outDir) +
      noSlashEnd(config.assets.icons.outName) +
      ".svg",
    vitePluginSvgSpriteIconsTempOutput:
      slashEnd(systemConfig.temp.icons.outDir) +
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
