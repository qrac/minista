import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { InlineConfig } from "vite"

import {
  MinistaConfig,
  MinistaUserConfig,
  MinistaBeautifyConfig,
} from "./types.js"
import { getFilePath, getFilePaths, getSameFilePaths } from "./path.js"
import {
  buildTempPages,
  buildStaticPages,
  buildCopyDir,
  buildTempAssets,
  buildAssetsTagStr,
  buildViteImporterRoots,
  buildViteImporterRoutes,
  buildViteImporterAssets,
} from "./build.js"
import { optimizeCommentOutStyleImport } from "./optimize.js"
import { beautifyFiles } from "./beautify.js"

export async function generateViteImporters(
  config: MinistaConfig,
  userConfig: MinistaUserConfig
) {
  const viteEntry =
    typeof userConfig.vite === "object"
      ? userConfig.vite?.build?.rollupOptions?.input
        ? userConfig.vite?.build?.rollupOptions?.input
        : {}
      : {}
  await Promise.all([
    buildViteImporterRoots(config),
    buildViteImporterRoutes(config),
    typeof viteEntry === "object" &&
      !Array.isArray(viteEntry) &&
      buildViteImporterAssets(config, viteEntry),
  ])
}

export async function generateTempRoot(
  config: MinistaConfig,
  mdxConfig: MdxOptions
) {
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

export async function generateTempPages(
  config: MinistaConfig,
  mdxConfig: MdxOptions
) {
  const srcPageFilePaths = await getFilePaths(config.pagesDir, config.pagesExt)
  await buildTempPages(srcPageFilePaths, {
    outbase: config.pagesDir,
    outdir: config.tempPagesDir,
    mdxConfig: mdxConfig,
  })
}

export async function generateAssets(
  config: MinistaConfig,
  viteConfig: InlineConfig
) {
  await buildTempAssets(viteConfig, {
    fileName: config.bundleName,
    outdir: config.tempAssetsDir,
    assetDir: config.assetsDir,
  })
  await buildCopyDir(
    config.tempAssetsDir,
    `${config.outDir}/${config.assetsDir}`,
    "assets"
  )
}

export async function generateNoStyleTemp(config: MinistaConfig) {
  const tempMjsFiles = await getFilePaths(config.tempDir, "mjs")
  await optimizeCommentOutStyleImport(tempMjsFiles)
}

export async function generateHtmlPages(config: MinistaConfig) {
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

export async function generatePublic(config: MinistaConfig) {
  await buildCopyDir(config.publicDir, config.outDir, "public")
}

export async function generateBeautify(
  config: MinistaConfig,
  beautifyConfig: MinistaBeautifyConfig,
  target: "html" | "css" | "js"
) {
  switch (target) {
    case "html":
      if (!beautifyConfig.useHtml) {
        return
      }
      const htmlFilePaths = await getFilePaths(config.outDir, "html")
      await beautifyFiles(htmlFilePaths, "html", beautifyConfig.htmlOptions)
      break
    case "css":
      if (!beautifyConfig.useCss) {
        return
      }
      const cssFilePaths = await getFilePaths(config.outDir, "css")
      await beautifyFiles(cssFilePaths, "css", beautifyConfig.htmlOptions)
      break
    case "js":
      if (!beautifyConfig.useJs) {
        return
      }
      const jsFilePaths = await getFilePaths(config.outDir, "js")
      await beautifyFiles(jsFilePaths, "js", beautifyConfig.htmlOptions)
      break
    default:
      break
  }
}
