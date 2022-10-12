import type { RollupOutput } from "rollup"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import pc from "picocolors"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
} from "vite"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type GenerateBundleBuildResult = {
  output: GenerateBundleBuildItem[]
}
type GenerateBundleBuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function generateBundle(config: ResolvedConfig) {
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
    })
  )
  mergedViteConfig.build.rollupOptions.input = {
    __minista_bundle_assets: path.join(__dirname, "/../server/bundle.js"),
  }

  const result = (await viteBuild(
    mergedViteConfig
  )) as unknown as GenerateBundleBuildResult

  const items = result.output

  if (!Array.isArray(items)) {
    return
  }
  if (items.length === 0) {
    return
  }

  await Promise.all(
    items.map(async (item) => {
      const isCss = item.fileName.match(/.*\.css$/)
      const isBundleJs = item.fileName.match(/__minista_bundle_assets\.js$/)
      const isBundleCss = item.fileName.match(/__minista_bundle_assets\.css$/)

      if (isBundleJs) {
        return
      }

      const bundleCssName = path.join(
        config.main.assets.outDir,
        config.main.assets.bundle.outName + ".css"
      )
      const vite3BugBundleCssName = path.join(
        config.main.assets.outDir,
        "bundle.css"
      )
      const isVite3BugBundleCss = item.fileName === vite3BugBundleCssName

      let fileName = item.fileName
      isBundleCss && (fileName = bundleCssName)
      isVite3BugBundleCss && (fileName = bundleCssName)

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (!data) {
        return
      }

      if (isCss && config.main.beautify.useAssets) {
        data = beautify.css(data, config.main.beautify.cssOptions)
      }

      const routePath = path.join(
        config.sub.resolvedRoot,
        config.main.out,
        fileName
      )
      const relativePath = path.relative(process.cwd(), routePath)

      return await fs
        .outputFile(routePath, data)
        .then(() => {
          console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(relativePath)}`)
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
}
