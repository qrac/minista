import type {
  UserConfig as ViteUserConfig,
  CSSOptions as ViteCSSOptions,
} from "vite"
import type { Config as SvgrOptions } from "@svgr/core"
import type { SvgstoreAddOptions } from "@qrac/svgstore"
import type { Options as HighlightOptions } from "rehype-highlight"
import type { Options as MdxOptions } from "@mdx-js/rollup"
import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"
import { deepmergeCustom } from "deepmerge-ts"

import type { ResolvedUserConfig } from "./user.js"
import type { Entry } from "./entry.js"
import type { Alias } from "./alias.js"

export type MainConfig = {
  root: string
  base: string
  public: string
  out: string
  assets: {
    entry: Entry
    outDir: string
    outName: string
    bundle: {
      outName: string
    }
    partial: {
      usePreact: boolean
      useIntersectionObserver: boolean
      outName: string
      rootAttrSuffix: string
      rootValuePrefix: string
      rootDOMElement: "div" | "span"
      rootStyle: React.CSSProperties
      intersectionObserverOptions: {
        root: Element | null
        rootMargin: string
        thresholds: ReadonlyArray<number>
      }
    }
    images: {
      outDir: string
      outName: string
    }
    fonts: {
      outDir: string
      outName: string
    }
    svgr: {
      svgrOptions: SvgrOptions
    }
    icons: {
      useSprite: boolean
      srcDir: string
      outDir: string
      outName: string
      svgstoreOptions: SvgstoreAddOptions
    }
    download: {
      useRemote: boolean
      remoteUrl: string[]
      remoteName: string
      outDir: string
    }
  }
  resolve: {
    alias: Alias
  }
  vite: ViteUserConfig
  css: ViteCSSOptions & { modules: { cache: boolean } }
  markdown: {
    syntaxHighlighter: "highlight" | "none"
    highlightOptions: HighlightOptions
    mdxOptions: MdxOptions
  }
  search: {
    useJson: boolean
    cache: boolean
    outDir: string
    outName: string
    include: string[]
    exclude: string[]
    trimTitle: string
    targetSelector: string
    hit: {
      minLength: number
      number: boolean
      english: boolean
      hiragana: boolean
      katakana: boolean
      kanji: boolean
    }
  }
  beautify: {
    useHtml: boolean
    useAssets: boolean
    htmlOptions: HTMLBeautifyOptions
    cssOptions: CSSBeautifyOptions
    jsOptions: JSBeautifyOptions
  }
}

export type ResolvedMainConfig = MainConfig

export const defaultMainConfig: MainConfig = {
  root: "",
  base: "/",
  public: "public",
  out: "dist",
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
        thresholds: [0],
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
  resolve: {
    alias: [],
  },
  vite: {},
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

export async function resolveMainConfig(
  userConfig?: ResolvedUserConfig
): Promise<ResolvedMainConfig> {
  const defaultConfig = defaultMainConfig
  const inlineConfig = userConfig || {}

  const customDeepmerge = deepmergeCustom({
    mergeArrays: false,
  })
  const mergedConfig = customDeepmerge(
    defaultConfig,
    inlineConfig
  ) as ResolvedMainConfig
  return mergedConfig
}
