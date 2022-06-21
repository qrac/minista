import type { AliasOptions as ViteAliasOptions } from "vite"
import { deepmergeCustom } from "deepmerge-ts"

import type {
  MinistaConfig,
  MinistaUserConfig,
  MinistaResolveConfig,
  MinistaEntry,
  EntryObject,
  UserEntryObject,
  MinistaResolveAliasInput,
  AliasArray,
} from "./types.js"

import { systemConfig } from "./system.js"
import { slashEnd, noSlashEnd, noSlashStart, getFilename } from "./utils.js"

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
  resolve: {
    alias: [],
  },
  css: {
    modules: {
      cache: true,
      scopeBehaviour: "local",
      globalModulePaths: [],
      generateScopedName: undefined,
      hashPrefix: "",
      localsConvention: "camelCaseOnly",
    },
    preprocessorOptions: {
      scss: {},
      less: {},
      stylus: {},
    },
  },
  markdown: {
    syntaxHighlighter: "highlight",
    highlightOptions: {},
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  },
  search: {
    useJson: false,
    cache: false,
    outDir: "assets",
    outName: "search",
    include: ["**/*"],
    exclude: ["404"],
    trimTitle: "",
    targetSelector: "[data-search]",
    hit: {
      minLength: 3,
      number: false,
      english: true,
      hiragana: false,
      katakana: true,
      kanji: true,
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
      inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
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

export async function resolveEntry(
  entry: MinistaEntry
): Promise<EntryObject[]> {
  const entries: EntryObject[] = []

  function getInsertPagesInclude(
    input: UserEntryObject["insertPages"]
  ): string[] {
    if (typeof input === "string") {
      return [input]
    } else if (Array.isArray(input) && input.length > 0) {
      return input
    } else if (typeof input === "object" && input.hasOwnProperty("include")) {
      const object = input as { include: string[] }
      return object.include
    } else {
      return ["**/*"]
    }
  }

  function getInsertPagesExclude(
    input: UserEntryObject["insertPages"]
  ): string[] {
    if (typeof input === "string") {
      return []
    } else if (Array.isArray(input) && input.length > 0) {
      const strArray = input as string[]
      const excludeArray = strArray.filter(
        (item) => item.startsWith("!") && item.replace(/^!/, "")
      )
      return excludeArray
    } else if (typeof input === "object" && input.hasOwnProperty("exclude")) {
      const object = input as { exclude: string[] }
      return object.exclude
    } else {
      return []
    }
  }

  async function getEntries(input: MinistaEntry) {
    if (!input) {
      return
    } else if (typeof input === "string") {
      const pattern = {
        name: getFilename(input),
        input: noSlashStart(input),
        insertPages: ["**/*"],
      }
      return entries.push(pattern)
    } else if (Array.isArray(input) && input.length > 0) {
      if (typeof input[0] === "string") {
        const strArray = input as string[]
        await Promise.all(
          strArray.map(async (item) => {
            const pattern = {
              name: getFilename(item),
              input: noSlashStart(item),
              insertPages: ["**/*"],
            }
            return entries.push(pattern)
          })
        )
      } else {
        const objectArray = input as UserEntryObject[]
        await Promise.all(
          objectArray.map(async (item) => {
            const name = item.name || getFilename(item.input)
            const include = getInsertPagesInclude(item.insertPages)
            const exclude = getInsertPagesExclude(item.insertPages)
            const fixedExclude = exclude.map((item) => "!" + item)
            const pattern = {
              name: name,
              input: noSlashStart(item.input),
              insertPages: [...include, ...fixedExclude],
            }
            return entries.push(pattern)
          })
        )
      }
    } else if (typeof input === "object") {
      await Promise.all(
        Object.entries(input).map((item) => {
          const pattern = {
            name: item[0],
            input: noSlashStart(item[1]),
            insertPages: ["**/*"],
          }
          return entries.push(pattern)
        })
      )
    }
  }
  await getEntries(entry)

  return entries
}

export async function mergeAlias(
  configAlias: MinistaResolveAliasInput,
  viteConfigAlias: ViteAliasOptions
): Promise<AliasArray> {
  const alias: AliasArray = []

  async function getAlias(input: MinistaResolveAliasInput | ViteAliasOptions) {
    if (!input) {
      return
    } else if (Array.isArray(input) && input.length > 0) {
      await Promise.all(
        input.map(async (item) => {
          const pattern = {
            find: item.find,
            replacement: item.replacement,
          }
          return alias.push(pattern)
        })
      )
    } else if (typeof input === "object") {
      await Promise.all(
        Object.entries(input).map((item) => {
          const pattern = {
            find: item[0],
            replacement: item[1],
          }
          return alias.push(pattern)
        })
      )
    }
  }
  await getAlias(configAlias)
  await getAlias(viteConfigAlias)

  return alias
}

export async function resolveConfig(
  config: MinistaConfig
): Promise<MinistaResolveConfig> {
  const configEntry = config.assets.entry
  const viteConfigEntry = config.vite.build?.rollupOptions?.input || ""
  const selectedEntry = configEntry || viteConfigEntry
  const entry = await resolveEntry(selectedEntry)

  const configAlias = config.resolve.alias
  const viteConfigAlias = config.vite.resolve?.alias || {}
  const alias = await mergeAlias(configAlias, viteConfigAlias)

  const resolvedConfig: MinistaResolveConfig = {
    ...config,
    entry: entry,
    alias: alias,
    rootSrcDir: noSlashEnd(config.root.srcDir),
    pagesSrcDir: noSlashEnd(config.pages.srcDir),
    publicOutDir: noSlashEnd(config.out),
    pagesOutDir: noSlashEnd(config.out),
    assetsOutHref: slashEnd(config.base) + noSlashEnd(config.assets.outDir),
    downloadOutDir:
      slashEnd(config.out) + noSlashEnd(config.assets.download.outDir),
    downloadOutHref:
      slashEnd(config.base) + noSlashEnd(config.assets.download.outDir),
    searchJsonOutput:
      slashEnd(config.out) +
      slashEnd(config.search.outDir) +
      noSlashEnd(config.search.outName) +
      ".json",
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
    vitePluginSearchJsonOutput:
      slashEnd("/") +
      slashEnd(config.search.outDir) +
      noSlashEnd(config.search.outName) +
      ".json",
    vitePluginSearchJsonTempOutput:
      slashEnd(systemConfig.temp.search.outDir) +
      slashEnd(config.search.outDir) +
      noSlashEnd(config.search.outName) +
      ".json",
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
