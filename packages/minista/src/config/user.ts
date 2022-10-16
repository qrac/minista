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
import { normalizePath } from "vite"
import { build } from "esbuild"
import { deepmergeCustom } from "deepmerge-ts"

import type { Entry } from "./entry.js"
import type { Alias } from "./alias.js"
import type { InlineConfig } from "./index.js"
import { getNodeModulesPath } from "../utility/path.js"

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
  inlineConfig?: InlineConfig
): Promise<ResolvedUserConfig> {
  const configFile = inlineConfig?.configFile

  const trimConfig = inlineConfig
  delete trimConfig?.configFile
  trimConfig?.base === undefined && delete trimConfig?.base

  const trimmedConfig = trimConfig || ({} as UserConfig)

  if (configFile === false) {
    return trimmedConfig
  }
  const configStr = typeof configFile === "string" ? configFile : ""

  const resolvedRoot = normalizePath(
    inlineConfig?.root ? path.resolve(inlineConfig.root) : process.cwd()
  )

  let configPaths = [configStr]

  const configName = "minista.config"
  const configExts = [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs", ".json"]

  configPaths = configPaths.concat(
    configExts.map((item) => path.join(resolvedRoot, configName + item))
  )
  configPaths = configPaths.concat(
    configExts.map((item) => path.join(process.cwd(), configName + item))
  )
  const configPath = configPaths.find((item) => fs.existsSync(item))

  if (configPath) {
    const compiledConfigPath = path.join(
      getNodeModulesPath(resolvedRoot),
      ".minista",
      "minista.config.mjs"
    )
    await build({
      entryPoints: [configPath],
      outfile: compiledConfigPath,
      bundle: true,
      format: "esm",
      platform: "node",
      minify: false,
      plugins: [
        {
          name: "minista-esbuild-plugin:external",
          setup(build) {
            let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/
            build.onResolve({ filter }, (args) => ({
              path: args.path,
              external: true,
            }))
          },
        },
      ],
    }).catch((err) => {
      console.error(err)
    })
    const { default: compiledUserConfig }: { default: UserConfig } =
      await import(compiledConfigPath)
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
