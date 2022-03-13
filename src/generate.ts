import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { InlineConfig } from "vite"

import { MinistaConfig } from "./types.js"
import { getFilePath, getFilePaths, getSameFilePaths } from "./path.js"
import {
  buildTempPages,
  buildStaticPages,
  buildCopyDir,
  buildTempAssets,
  buildAssetsTagStr,
} from "./build.js"
import { optimizeCommentOutStyleImport } from "./optimize.js"
import { cleanHtmlPages } from "./clean.js"

export const generateTempRoot = async (
  config: MinistaConfig,
  mdxConfig: MdxOptions
) => {
  const srcRootFilePaths = await getSameFilePaths(
    config.rootFileDir,
    config.rootFileName,
    config.rootFileExt
  )
  if (srcRootFilePaths.length > 0) {
    await buildTempPages([srcRootFilePaths[0]], {
      outbase: config.rootFileDir,
      outdir: config.tempRootFileDir,
      mdxConfig: mdxConfig,
    })
  }
}

export const generateTempPages = async (
  config: MinistaConfig,
  mdxConfig: MdxOptions
) => {
  const srcPageFilePaths = await getFilePaths(config.pagesDir, config.pagesExt)
  await buildTempPages(srcPageFilePaths, {
    outbase: config.pagesDir,
    outdir: config.tempPagesDir,
    mdxConfig: mdxConfig,
  })
}

export const generateAssets = async (
  config: MinistaConfig,
  viteConfig: InlineConfig
) => {
  await buildTempAssets(viteConfig, {
    fileName: config.autoAssetsName,
    outdir: config.tempAssetsDir,
    assetDir: config.assetsDir,
  })
  await buildCopyDir(
    config.tempAssetsDir,
    `${config.outDir}/${config.assetsDir}`,
    "assets"
  )
}

export const generateNoStyleTemp = async (config: MinistaConfig) => {
  const tempMjsFiles = await getFilePaths(config.tempDir, "mjs")
  await optimizeCommentOutStyleImport(tempMjsFiles)
}

export const generateHtmlPages = async (config: MinistaConfig) => {
  const tempPageFilePaths = await getFilePaths(config.tempPagesDir, "mjs")
  const tempRootFilePath = getFilePath(
    config.tempRootFileDir,
    config.rootFileName,
    "mjs"
  )
  const tempAssetsFilePaths = await getFilePaths(config.tempAssetsDir, [
    "css",
    "js",
  ])
  const assetsTagStr = await buildAssetsTagStr(tempAssetsFilePaths, {
    outbase: config.tempAssetsDir,
    outdir: config.assetsDir,
  })
  await buildStaticPages(
    tempPageFilePaths,
    tempRootFilePath,
    {
      outbase: config.tempPagesDir,
      outdir: config.outDir,
    },
    assetsTagStr
  )
}

export const generatePublic = async (config: MinistaConfig) => {
  await buildCopyDir(config.publicDir, config.outDir, "public")
}

export const generateCleanHtml = async (config: MinistaConfig) => {
  const htmlPageFilePaths = await getFilePaths(config.outDir, "html")
  await cleanHtmlPages(htmlPageFilePaths)
}
