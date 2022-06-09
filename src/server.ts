import type { InlineConfig } from "vite"
import type { Options as MdxOptions } from "@mdx-js/esbuild"

import fs from "fs-extra"
import path from "path"
import { createServer } from "vite"

import type { MinistaResolveConfig } from "./types.js"

import { systemConfig } from "./system.js"
import { getFilterFilePaths } from "./path.js"
import { emptyResolveDir } from "./empty.js"
import {
  generateTempRoot,
  generateTempPages,
  generateNoStyleTemp,
  generateHtmlPages,
} from "./generate.js"
import { buildSearchJson } from "./build.js"

export async function createDevServer(viteConfig: InlineConfig) {
  const server = await createServer(viteConfig)
  await server.listen()
  server.printUrls()
}

export async function createDevServerAssets(
  config: MinistaResolveConfig,
  mdxConfig: MdxOptions
) {
  const stopUseTriggers = [!config.search.useJson]
  const stopUseTrigger = stopUseTriggers.every((trigger) => trigger)

  if (stopUseTrigger) {
    return
  }

  const searchFile = systemConfig.temp.search.outDir + "/search.json"
  const searchFileRelative = path.relative(".", searchFile)
  const searchFileExists = fs.existsSync(searchFileRelative)
  const searchUseCacheExists = config.search.cache && searchFileExists

  const stopCacheTriggers = [searchUseCacheExists]
  const stopCacheTrigger = stopCacheTriggers.every((cache) => cache)

  if (stopCacheTrigger) {
    return
  }

  await emptyResolveDir(systemConfig.temp.html.outDir)
  await Promise.all([
    generateTempRoot(config, mdxConfig),
    generateTempPages(config, mdxConfig),
  ])
  await Promise.all([
    generateNoStyleTemp(systemConfig.temp.root.outDir),
    generateNoStyleTemp(systemConfig.temp.pages.outDir),
  ])
  await generateHtmlPages(config, systemConfig.temp.html.outDir, false)

  const searchEntryPoints = await getFilterFilePaths({
    targetDir: systemConfig.temp.html.outDir,
    include: config.search.include,
    exclude: config.search.exclude,
    exts: "html",
  })
  //console.log("searchEntryPoints", searchEntryPoints)
  await buildSearchJson({
    config: config,
    useCacheExists: searchUseCacheExists,
    entryPoints: searchEntryPoints,
    entryBase: systemConfig.temp.html.outDir,
    outFile: searchFile,
    showLog: false,
  })
  return
}
