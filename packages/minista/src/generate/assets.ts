import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"

export async function generateAssets({
  config,
  items,
  bundleName,
  bugName,
}: {
  config: ResolvedConfig
  items: BuildResult["output"]
  bundleName: string
  bugName: string
}) {
  await Promise.all(
    items.map(async (item) => {
      const isJs = item.fileName.match(/.*\.js$/)
      const isCss = item.fileName.match(/.*\.css$/)
      const isBundleJs = item.fileName.match(/__minista_script_bundle\.js$/)
      const isBundleCss = item.fileName.match(/__minista_script_bundle\.css$/)
      const isBugCss = item.fileName === bugName

      if (isBundleJs) {
        return
      }

      let fileName = item.fileName
      isBundleCss && (fileName = bundleName)
      isBugCss && (fileName = bundleName)

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (!data) {
        return
      }

      if (isJs && config.main.beautify.useAssets) {
        data = beautify.js(data, config.main.beautify.jsOptions)
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
