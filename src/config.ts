import { deepmergeCustom } from "deepmerge-ts"

import type {
  MinistaConfig,
  MinistaUserConfig,
  MinistaTempConfig,
} from "./types.js"

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

export const tempConfig: MinistaTempConfig = {
  out: "node_modules/.minista",
  config: {
    outDir: "node_modules/.minista/optimized-config",
  },
  viteImporter: {
    outDir: "node_modules/.minista/vite-importer",
  },
  root: {
    outDir: "node_modules/.minista/bundled-react-root",
  },
  pages: {
    outDir: "node_modules/.minista/bundled-react-pages",
  },
  assets: {
    outDir: "node_modules/.minista/bundled-react-assets",
  },
  icons: {
    outDir: "node_modules/.minista/svg-sprite-icons",
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
