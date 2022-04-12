import type { UserConfig as ViteConfig, InlineConfig } from "vite"
import type { Options as MdxOptions } from "@mdx-js/esbuild"

import type { MinistaResolveConfig } from "./types.js"

import { systemConfig } from "./system.js"
import { getFilePath, getFilePaths, getSameFilePaths } from "./path.js"
import { slashEnd, noSlashEnd } from "./utils.js"
import {
  buildTempPages,
  buildStaticPages,
  buildCopyDir,
  buildTempAssets,
  buildAssetsTagStr,
  buildViteImporterRoots,
  buildViteImporterRoutes,
  buildViteImporterAssets,
  buildViteImporterBlankAssets,
} from "./build.js"
import { optimizeCommentOutStyleImport } from "./optimize.js"
import { downloadFiles } from "./download.js"
import { beautifyFiles } from "./beautify.js"

export async function generateViteImporters(
  config: MinistaResolveConfig,
  viteConfig: ViteConfig
) {
  const viteEntry = viteConfig.build?.rollupOptions?.input || {}

  await Promise.all([
    buildViteImporterRoots(config),
    buildViteImporterRoutes(config),
  ])

  if (
    typeof viteEntry === "object" &&
    Object.keys(viteEntry).length > 0 &&
    !Array.isArray(viteEntry)
  ) {
    await buildViteImporterAssets(viteEntry)
  } else {
    await buildViteImporterBlankAssets()
  }
}

export async function generateTempRoot(
  config: MinistaResolveConfig,
  mdxConfig: MdxOptions
) {
  const srcRootFilePaths = await getSameFilePaths(
    config.rootSrcDir,
    config.root.srcName,
    config.root.srcExt
  )
  if (srcRootFilePaths.length > 0) {
    await buildTempPages([srcRootFilePaths[0]], {
      outBase: config.rootSrcDir,
      outDir: systemConfig.temp.root.outDir,
      mdxConfig: mdxConfig,
    })
  }
}

export async function generateTempPages(
  config: MinistaResolveConfig,
  mdxConfig: MdxOptions
) {
  const srcPageFilePaths = await getFilePaths(
    config.pagesSrcDir,
    config.pages.srcExt
  )
  await buildTempPages(srcPageFilePaths, {
    outBase: config.pagesSrcDir,
    outDir: systemConfig.temp.pages.outDir,
    mdxConfig: mdxConfig,
  })
}

export async function generateAssets(
  config: MinistaResolveConfig,
  viteConfig: InlineConfig
) {
  await buildTempAssets(viteConfig, {
    bundleOutName: config.assets.bundle.outName,
    outDir: systemConfig.temp.assets.outDir,
    assetDir: config.assets.outDir,
  })
  await buildCopyDir(
    systemConfig.temp.assets.outDir,
    slashEnd(config.out) + noSlashEnd(config.assets.outDir),
    "assets"
  )
}

export async function generateNoStyleTemp() {
  const tempRootOutDir = systemConfig.temp.root.outDir
  const tempPagesOutDir = systemConfig.temp.pages.outDir
  const tempRootFiles = await getFilePaths(tempRootOutDir, "mjs")
  const tempPagesFiles = await getFilePaths(tempPagesOutDir, "mjs")
  await optimizeCommentOutStyleImport(tempRootFiles)
  await optimizeCommentOutStyleImport(tempPagesFiles)
}

export async function generateHtmlPages(config: MinistaResolveConfig) {
  const tempRootName = config.root.srcName
  const tempRootOutDir = systemConfig.temp.root.outDir
  const tempPagesOutDir = systemConfig.temp.pages.outDir
  const tempAssetsOutDir = systemConfig.temp.assets.outDir

  const tempRootFilePath = getFilePath(tempRootOutDir, tempRootName, "mjs")
  const tempPageFilePaths = await getFilePaths(tempPagesOutDir, "mjs")
  const tempAssetsFilePaths = await getFilePaths(tempAssetsOutDir, [
    "css",
    "js",
  ])
  const assetsTagStr = await buildAssetsTagStr(tempAssetsFilePaths, {
    outBase: tempAssetsOutDir,
    outDir: config.assetsOutHref,
  })
  await buildStaticPages(
    tempPageFilePaths,
    tempRootFilePath,
    {
      outBase: tempPagesOutDir,
      outDir: config.pagesOutDir,
    },
    assetsTagStr
  )
}

export async function generatePublic(config: MinistaResolveConfig) {
  await buildCopyDir(config.public, config.publicOutDir, "public")
}

export async function generateDownload(config: MinistaResolveConfig) {
  if (config.assets.download.useRemote && config.assets.download.remoteUrl) {
    const htmlFilePaths = await getFilePaths(config.out, "html")
    await downloadFiles(
      htmlFilePaths,
      config.assets.download.remoteUrl,
      config.assets.download.remoteName,
      config.downloadOutDir,
      config.downloadOutHref
    )
  }
  return
}

export async function generateBeautify(
  config: MinistaResolveConfig,
  target: "html" | "css" | "js"
) {
  switch (target) {
    case "html":
      if (!config.beautify.useHtml) {
        return
      }
      const htmlFilePaths = await getFilePaths(config.out, "html")
      await beautifyFiles(htmlFilePaths, "html", config.beautify.htmlOptions)
      break
    case "css":
      if (!config.beautify.useAssets) {
        return
      }
      const cssFilePaths = await getFilePaths(config.out, "css")
      await beautifyFiles(cssFilePaths, "css", config.beautify.htmlOptions)
      break
    case "js":
      if (!config.beautify.useAssets) {
        return
      }
      const jsFilePaths = await getFilePaths(config.out, "js")
      await beautifyFiles(jsFilePaths, "js", config.beautify.htmlOptions)
      break
    default:
      break
  }
}
