import type { InlineConfig } from "vite"
import type { Options as MdxOptions } from "@mdx-js/esbuild"

import fs from "fs-extra"
import path from "path"
import url from "url"

import type { MinistaResolveConfig, EntryObject } from "./types.js"

import { systemConfig } from "./system.js"
import {
  getFilePath,
  getFilePaths,
  getFilterFilePaths,
  getSameFilePaths,
} from "./path.js"
import { slashEnd, noSlashEnd } from "./utils.js"
import {
  buildTempPages,
  buildStaticPages,
  buildCopyDir,
  buildTempAssets,
  buildAssetsTagArray,
  buildViteImporterRoots,
  buildViteImporterRoutes,
  buildViteImporterAssets,
  buildViteImporterBlankAssets,
  buildPartialModules,
  buildPartialStringIndex,
  buildPartialStringBundle,
  buildPartialStringInitial,
  buildPartialHydratePages,
  buildPartialHydrateIndex,
  buildPartialHydrateAsset,
  buildSearchJson,
} from "./build.js"
import { optimizeCommentOutStyleImport } from "./optimize.js"
import { downloadFiles } from "./download.js"
import { beautifyFiles } from "./beautify.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function generateViteImporters(config: MinistaResolveConfig) {
  await Promise.all([
    buildViteImporterRoots(config),
    buildViteImporterRoutes(config),
  ])

  if (config.entry.length > 0) {
    await buildViteImporterAssets(config.entry)
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
      alias: config.alias,
      mdxConfig: mdxConfig,
      svgrOptions: config.assets.svgr.svgrOptions,
      cssOptions: config.css,
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
    alias: config.alias,
    mdxConfig: mdxConfig,
    svgrOptions: config.assets.svgr.svgrOptions,
    cssOptions: config.css,
  })
}

export async function generateTempAssets(
  config: MinistaResolveConfig,
  viteConfig: InlineConfig
) {
  await buildTempAssets(viteConfig, {
    input: path.resolve(__dirname + "/../dist/bundle.js"),
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

export async function generatePartialHydration(
  config: MinistaResolveConfig,
  mdxConfig: MdxOptions,
  viteConfig: InlineConfig
) {
  const moduleDir = systemConfig.temp.partialHydration.outDir + "/modules"

  const moduleDirRelative = path.relative(".", moduleDir)
  const moduleDirExists = fs.existsSync(moduleDirRelative)

  if (!moduleDirExists) {
    return
  }

  const moduleFilePaths = await getFilePaths(moduleDir, "txt")

  if (moduleFilePaths.length === 0) {
    return
  }

  const partialModules = await buildPartialModules(moduleFilePaths, config)

  const outDir = systemConfig.temp.partialHydration.outDir
  const stringIndex = `${outDir}/string-index.mjs`
  const stringBundle = `${outDir}/string-bundle.mjs`
  const stringInitial = `${outDir}/string-initial.json`
  const hydratePages = `${outDir}/hydrate-pages.json`
  const hydrateIndex = `${outDir}/hydrate-index.mjs`

  await buildPartialStringIndex(partialModules, { outFile: stringIndex })
  await buildPartialStringBundle(stringIndex, {
    outFile: stringBundle,
    mdxConfig: mdxConfig,
    alias: config.alias,
    svgrOptions: config.assets.svgr.svgrOptions,
    cssOptions: config.css,
  })
  await optimizeCommentOutStyleImport([stringBundle])
  await buildPartialStringInitial(stringBundle, partialModules, {
    outFile: stringInitial,
  })

  if (config.assets.partial.useSplitPerPage) {
    const perPagesDir = systemConfig.temp.partialHydration.outDir + "/per-pages"
    const roots = await getFilePaths(systemConfig.temp.root.outDir, "mjs")
    const pages = await getFilePaths(systemConfig.temp.pages.outDir, "mjs")

    const partialHydratePages = await buildPartialHydratePages(
      partialModules,
      config,
      {
        roots: roots,
        pages: pages,
        outBase: systemConfig.temp.pages.outDir,
        outFile: hydratePages,
      }
    )
    await Promise.all(
      partialHydratePages.map(async (item) => {
        await buildPartialHydrateIndex(item.hasPartialModules, config, {
          outFile: `${perPagesDir}/${item.name}.mjs`,
        })
      })
    )
    await Promise.all(
      partialHydratePages.map(async (item) => {
        await buildPartialHydrateAsset(viteConfig, config, {
          input: `${perPagesDir}/${item.name}.mjs`,
          bundleOutName: item.name,
          outDir: systemConfig.temp.assets.outDir,
          assetDir: config.assets.outDir,
          usePreact: config.assets.partial.usePreact,
        })
      })
    )
  } else {
    await buildPartialHydrateIndex(partialModules, config, {
      outFile: hydrateIndex,
    })
    await buildPartialHydrateAsset(viteConfig, config, {
      input: hydrateIndex,
      bundleOutName: config.assets.partial.outName,
      outDir: systemConfig.temp.assets.outDir,
      assetDir: config.assets.outDir,
      usePreact: config.assets.partial.usePreact,
    })
  }
}

export async function generateNoStyleTemp(targetDir: string) {
  const targetFiles = await getFilePaths(targetDir, "mjs")
  if (targetFiles.length !== 0) {
    await optimizeCommentOutStyleImport(targetFiles)
  }
}

export async function generateHtmlPages(
  config: MinistaResolveConfig,
  outDir: string,
  showLog: boolean
) {
  const tempRootName = config.root.srcName
  const tempRootOutDir = systemConfig.temp.root.outDir
  const tempPagesOutDir = systemConfig.temp.pages.outDir
  const tempAssetsOutDir = systemConfig.temp.assets.outDir
  const tempPartialOutDir = systemConfig.temp.partialHydration.outDir

  const tempRootFilePath = getFilePath(tempRootOutDir, tempRootName, "mjs")
  const tempPageFilePaths = await getFilePaths(tempPagesOutDir, "mjs")
  const tempAssetsFilePaths = await getFilePaths(tempAssetsOutDir, [
    "css",
    "js",
  ])

  async function getPattern(filePath: string) {
    const targetRelative = path.relative(".", filePath)
    const targetJson = JSON.parse(await fs.readFile(targetRelative, "utf8"))
    const result: EntryObject[] = targetJson.map(
      (item: { name: string; insertPages: string[] }) => ({
        name: item.name,
        input: "",
        insertPages: item.insertPages,
      })
    )
    return result
  }

  const tempPartialFilePath = getFilePath(
    tempPartialOutDir,
    "hydrate-pages",
    "json"
  )
  const partialPattern = tempAssetsFilePaths
    ? await getPattern(tempPartialFilePath)
    : []

  const assetsTagArray = buildAssetsTagArray({
    entryPoints: tempAssetsFilePaths,
    outBase: tempAssetsOutDir,
    hrefBase: config.assetsOutHref,
    entryPattern: config.entry,
    partialPattern: partialPattern,
  })
  await buildStaticPages({
    entryPoints: tempPageFilePaths,
    tempRootFilePath: tempRootFilePath,
    outBase: tempPagesOutDir,
    outDir: outDir,
    assetsTagArray: assetsTagArray,
    showLog: showLog,
  })
}

export async function generateAssets(config: MinistaResolveConfig) {
  await buildCopyDir(
    systemConfig.temp.assets.outDir,
    slashEnd(config.out) + noSlashEnd(config.assets.outDir),
    "assets"
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

export async function generateSearchJson(config: MinistaResolveConfig) {
  if (config.search.useJson) {
    const entryPoints = await getFilterFilePaths({
      targetDir: config.out,
      include: config.search.include,
      exclude: config.search.exclude,
      exts: "html",
    })
    const outFile = config.searchJsonOutput

    await buildSearchJson({
      config: config,
      useCacheExists: false,
      entryPoints: entryPoints,
      entryBase: config.out,
      outFile: outFile,
      showLog: true,
    })
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
