import type { ExoticComponent } from "react"
import type {
  UserConfig as ViteUserConfig,
  CorsOptions as ViteCorsOptions,
} from "vite"
import type { Config as SvgrOptions } from "@svgr/core"
import type { Options as HighlightOptions } from "rehype-highlight"
import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"

import type Sass from "sass"
import type Stylus from "stylus"

export type MinistaConfig = {
  base: string
  public: string
  out: string
  root: {
    srcDir: string
    srcName: string
    srcExt: string[]
  }
  pages: {
    srcDir: string
    srcExt: string[]
  }
  assets: {
    entry: string | string[] | { [key: string]: string }
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
      svgstoreOptions: MinistaSvgstoreOptions
    }
    download: {
      useRemote: boolean
      remoteUrl: string[]
      remoteName: string
      outDir: string
    }
  }
  vite: ViteUserConfig
  markdown: {
    syntaxHighlighter: "highlight" | "none"
    highlightOptions: HighlightOptions
    mdxOptions: MdxOptions
  }
  beautify: {
    useHtml: boolean
    useAssets: boolean
    htmlOptions: HTMLBeautifyOptions
    cssOptions: CSSBeautifyOptions
    jsOptions: JSBeautifyOptions
  }
  css: CssOptions
}

export type MinistaUserConfig = {
  base?: string
  public?: string
  out?: string
  root?: {
    srcDir?: string
    srcName?: string
    srcExt?: string[]
  }
  pages?: {
    srcDir?: string
    srcExt?: string[]
  }
  assets?: {
    entry?: string | string[] | { [key: string]: string }
    outDir?: string
    outName?: string
    bundle?: {
      outName?: string
    }
    partial?: {
      usePreact?: boolean
      useIntersectionObserver?: boolean
      outName?: string
      rootAttrSuffix?: string
      rootValuePrefix?: string
      rootDOMElement?: "div" | "span"
      rootStyle?: React.CSSProperties
      intersectionObserverOptions?: {
        root?: Element | null
        rootMargin?: string
        thresholds?: ReadonlyArray<number>
      }
    }
    images?: {
      outDir?: string
      outName?: string
    }
    fonts?: {
      outDir?: string
      outName?: string
    }
    svgr?: {
      svgrOptions?: SvgrOptions
    }
    icons?: {
      useSprite?: boolean
      srcDir?: string
      outDir?: string
      outName?: string
      svgstoreOptions?: MinistaSvgstoreOptions
    }
    download?: {
      useRemote?: boolean
      remoteUrl?: string[]
      remoteName?: string
      outDir?: string
    }
  }
  vite?: ViteUserConfig
  markdown?: {
    syntaxHighlighter?: "highlight" | "none"
    highlightOptions?: HighlightOptions
    mdxOptions?: MdxOptions
  }
  beautify?: {
    useHtml?: boolean
    useAssets?: boolean
    htmlOptions?: HTMLBeautifyOptions
    cssOptions?: CSSBeautifyOptions
    jsOptions?: JSBeautifyOptions
  }
  css?: CssUserOptions
}

export type MinistaSvgstoreOptions = {
  cleanDefs?: Boolean | string[]
  cleanSymbols?: Boolean | string[]
  svgAttrs?: Boolean | { [key: string]: string }
  symbolAttrs?: Boolean | { [key: string]: string }
  copyAttrs?: Boolean | string[]
  renameDefs?: Boolean
}

export type MinistaResolveConfig = MinistaConfig & MinistaResolvePathConfig

export type MinistaResolvePathConfig = {
  rootSrcDir: string
  pagesSrcDir: string
  publicOutDir: string
  pagesOutDir: string
  assetsOutHref: string
  downloadOutDir: string
  downloadOutHref: string
  viteAssetsOutput: string
  viteAssetsImagesOutput: string
  viteAssetsFontsOutput: string
  vitePluginSvgSpriteIconsSrcDir: string
  vitePluginSvgSpriteIconsOutput: string
  vitePluginSvgSpriteIconsTempOutput: string
}

export type MinistaSystemConfig = {
  temp: {
    out: string
    config: {
      outDir: string
    }
    viteImporter: {
      outDir: string
    }
    partialHydration: {
      outDir: string
    }
    root: {
      outDir: string
    }
    pages: {
      outDir: string
    }
    assets: {
      outDir: string
    }
    icons: {
      outDir: string
    }
  }
}

export type MinistaCliDevOptions = {
  host?: string | boolean
  port?: number
  strictPort?: boolean
  https?: boolean
  open?: boolean | string
  cors?: boolean | ViteCorsOptions
}

export type MinistaCliPreviewOptions = {
  host?: string | boolean
  port?: number
  strictPort?: boolean
  https?: boolean
  open?: boolean | string
}

export type MinistaLocation = {
  pathname: string
}

export type RootStaticContent = {
  component: RootJsxContent
  staticData: GlobalStaticData
}
export type RootEsmContent = {
  default: RootJsxContent
  getStaticData?: GetGlobalStaticData
}
export type RootJsxContent =
  | ExoticComponent<{ children?: React.ReactNode }>
  | React.ReactElement<any, string | React.JSXElementConstructor<any>>
export type GlobalStaticData = { props?: {} } | undefined
export type GetGlobalStaticData = () => Promise<GlobalStaticData>

export type PageEsmContent = {
  default: PageJsxContent
  getStaticData?: GetStaticData
  frontmatter?: {}
}
export type PageJsxContent = React.ReactElement<
  any,
  string | React.JSXElementConstructor<any>
>
export type StaticData = StaticDataList | StaticDataItem | undefined
export type StaticDataList = StaticDataItem[]
export type StaticDataItem = {
  props?: {}
  paths?: {}
}
export type StaticDataCache = { key: [StaticDataList] } | {}
export type GetStaticData = () => Promise<StaticData>

export type PartialModules = {
  id: string
  phId: string
  phDomId: string
  htmlId: string
  targetsId: string
  importer: string
  rootAttr: string
  rootDOMElement: string
  rootStyleStr: string
}[]
export type PartialString = {
  [key: string]: string
}

export type CSSModulesOptions = {
  cache: boolean
  scopeBehaviour: "global" | "local"
  globalModulePaths: RegExp[]
  generateScopedName:
    | undefined
    | string
    | ((name: string, filename: string, css: string) => string)
  hashPrefix: string
  localsConvention: "camelCase" | "camelCaseOnly" | "dashes" | "dashesOnly"
}
export type CssOptions = {
  modules: CSSModulesOptions | false
  preprocessorOptions: {
    scss: Sass.Options<"async">
    less: Less.Options
    stylus: Stylus.RenderOptions
  }
}
export type CssUserOptions = {
  modules?: Partial<CSSModulesOptions> | false
  preprocessorOptions?: {
    scss?: Sass.Options<"async">
    less?: Less.Options
    stylus?: Stylus.RenderOptions
  }
}
