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
import path from "node:path"
import fs from "fs-extra"
import { normalizePath, createServer as createViteServer } from "vite"
import { deepmergeCustom } from "deepmerge-ts"

import type { Entry } from "./entry.js"
import type { Alias } from "./alias.js"
import type { InlineConfig } from "./index.js"

export type UserConfig = {
  root?: string
  base?: string
  public?: string
  out?: string
  assets?: {
    entry?: Entry
    outDir?: string
    outName?: string
    bundle?: {
      outName?: string
    }
    partial?: {
      useSplitPerPage?: boolean
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
      svgstoreOptions?: SvgstoreAddOptions
    }
    download?: {
      useRemote?: boolean
      remoteUrl?: string[]
      remoteName?: string
      outDir?: string
    }
  }
  resolve?: {
    alias?: Alias
  }
  vite?: ViteUserConfig
  css?: ViteCSSOptions & { modules?: { cache?: boolean } }
  markdown?: {
    syntaxHighlighter?: "highlight" | "none"
    highlightOptions?: HighlightOptions
    mdxOptions?: MdxOptions
  }
  search?: {
    useJson?: boolean
    cache?: boolean
    outDir?: string
    outName?: string
    include?: string[]
    exclude?: string[]
    trimTitle?: string
    targetSelector?: string
    hit?: {
      minLength?: number
      number?: boolean
      english?: boolean
      hiragana?: boolean
      katakana?: boolean
      kanji?: boolean
    }
  }
  beautify?: {
    useHtml?: boolean
    useAssets?: boolean
    htmlOptions?: HTMLBeautifyOptions
    cssOptions?: CSSBeautifyOptions
    jsOptions?: JSBeautifyOptions
  }
}

export type ResolvedUserConfig = UserConfig

export async function resolveUserConfig(
  inlineConfig?: InlineConfig,
  options?: {
    configPaths?: string[]
  }
): Promise<ResolvedUserConfig> {
  const configFile = inlineConfig?.configFile

  const trimConfig = inlineConfig
  delete trimConfig?.configFile
  trimConfig?.base === undefined && delete trimConfig?.base

  const trimmedConfig = trimConfig || ({} as UserConfig)

  if (configFile === false) {
    return trimmedConfig
  }

  const resolvedRoot = normalizePath(
    inlineConfig?.root ? path.resolve(inlineConfig.root) : process.cwd()
  )
  const configStr = typeof configFile === "string" ? configFile : ""
  const configPaths = options?.configPaths || [
    "minista.config.ts",
    "minista.config.tsx",
    "minista.config.js",
    "minista.config.jsx",
    "minista.config.cjs",
    "minista.config.mjs",
    "minista.config.json",
  ]

  const mergedConfigPaths = [...new Set([configStr, ...configPaths])].flat()
  const filterdConfigPaths = mergedConfigPaths.filter(
    (configPath) =>
      configPath && fs.existsSync(path.join(resolvedRoot, configPath))
  )

  if (filterdConfigPaths.length > 0) {
    const entryPoint = path.join(resolvedRoot, filterdConfigPaths[0])

    const viteServer = await createViteServer()

    const { default: compiledUserConfig } = (await viteServer.ssrLoadModule(
      entryPoint
    )) as { default: UserConfig }

    await viteServer.close()

    const customDeepmerge = deepmergeCustom({
      mergeArrays: false,
    })
    const mergedConfig = customDeepmerge(
      compiledUserConfig,
      trimmedConfig
    ) as UserConfig
    return mergedConfig
  } else {
    return trimmedConfig
  }
}
