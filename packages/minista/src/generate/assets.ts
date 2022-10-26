import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"

export async function generateAssets({
  config,
  items,
}: {
  config: ResolvedConfig
  items: BuildResult["output"]
}) {
  const bundleCssName = path.join(
    config.main.assets.outDir,
    config.main.assets.bundle.outName + ".css"
  )
  const bugBundleCssName = path.join(config.main.assets.outDir, "bundle.css")

  await Promise.all(
    items.map(async (item) => {
      const isCss = item.fileName.match(/.*\.css$/)
      const isJs = item.fileName.match(/.*\.js$/)
      const isBundleCss = item.fileName.match(
        /__minista_plugin_get_bundle\.css$/
      )
      const isBugBundleCss = item.fileName === bugBundleCssName
      const isBundleJs = item.fileName.match(/__minista_plugin_get_bundle\.js$/)

      if (isBundleJs) {
        return
      }

      let fileName = item.fileName
      isBundleCss && (fileName = bundleCssName)
      isBugBundleCss && (fileName = bundleCssName)

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (!data || data === "\n") {
        return
      }

      if (isCss && config.main.beautify.useAssets) {
        data = beautify.css(data, config.main.beautify.cssOptions)
      }
      if (isJs && config.main.beautify.useAssets) {
        data = beautify.js(data, config.main.beautify.jsOptions)
      }

      const routePath = path.join(
        config.sub.resolvedRoot,
        config.main.out,
        fileName
      )
      const relativePath = path.relative(process.cwd(), routePath)
      const dataSize = (data.length / 1024).toFixed(2)

      return await fs
        .outputFile(routePath, data)
        .then(() => {
          console.log(
            `${pc.bold(pc.green("BUILD"))} ${pc.bold(relativePath)}` +
              " " +
              pc.gray(`${dataSize} KiB`)
          )
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
}
