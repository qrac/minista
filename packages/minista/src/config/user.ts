import type {
  UserConfig as ViteUserConfig,
  CSSOptions as ViteCSSOptions,
} from "vite"
import type { Config as SvgrOptions } from "@svgr/core"
import type { SvgstoreAddOptions } from "@qrac/svgstore"
import type { Options as RemarkGfmOptions } from "remark-gfm"
import type { Options as RehypeHighlightOptions } from "rehype-highlight"
import type { Options as MdxOptions } from "@mdx-js/rollup"
import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"
import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"
import path from "node:path"
import fs from "fs-extra"
import { normalizePath } from "vite"
import { build as esBuild } from "esbuild"
import { deepmergeCustom } from "deepmerge-ts"

import type { EntryPatterns } from "./entry.js"
import type { AliasPatterns } from "./alias.js"
import type { ImageOptimize } from "./image.js"
import type { InlineConfig } from "./index.js"
import { getNodeModulesPath } from "../utility/path.js"

export type UserConfig = {
  root?: string
  base?: string
  public?: string
  out?: string
  assets?: {
    entry?: EntryPatterns
    outDir?: string
    outName?: string
    images?: {
      outDir?: string
      outName?: string
      remoteName?: string
      optimize?: Partial<ImageOptimize>
    }
    svgr?: {
      svgrOptions?: SvgrOptions
    }
    icons?: {
      srcDir?: string
      outDir?: string
      outName?: string
      svgstoreOptions?: SvgstoreAddOptions
    }
    fonts?: {
      outDir?: string
      outName?: string
    }
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
  }
  resolve?: {
    alias?: AliasPatterns
  }
  css?: ViteCSSOptions
  markdown?: {
    useRemarkGfm?: boolean
    useRehypeHighlight?: boolean
    remarkGfmOptions?: RemarkGfmOptions
    rehypeHighlightOptions?: RehypeHighlightOptions
    mdxOptions?: MdxOptions
  }
  search?: {
    outDir?: string
    outName?: string
    include?: string[]
    exclude?: string[]
    baseUrl?: string
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
  storyapp?: {
    useImport?: boolean
    outDir?: string
  }
  delivery?: {
    include?: string[]
    exclude?: string[]
    trimTitle?: string
    sortBy?: "path" | "title"
    archives?: {
      srcDir: string
      outDir: string
      outName: string
      format: ArchiverFormat
      options?: ArchiverOptions
      ignore?: string[]
      button?: {
        title?: string
        color?: string
      }
    }[]
  }
  beautify?: {
    useHtml?: boolean
    useAssets?: boolean
    htmlOptions?: HTMLBeautifyOptions
    cssOptions?: CSSBeautifyOptions
    jsOptions?: JSBeautifyOptions
  }
  vite?: ViteUserConfig
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
    await esBuild({
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
