import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildItem } from "../cli/build.js"

export async function generateMain({
  config,
  mainItems,
}: {
  config: ResolvedConfig
  mainItems: BuildItem[]
}) {
  const items = mainItems

  if (!Array.isArray(items) || items.length === 0) {
    return
  }

  await Promise.all(
    items.map(async (item) => {
      const isPage = item.fileName.match(/src\/pages\/.*\.html$/)
      const isJs = item.fileName.match(/.*\.js$/)
      const isCss = item.fileName.match(/.*\.css$/)

      let fileName = item.fileName
      isPage && (fileName = item.fileName.replace(/src\/pages\//, ""))

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (!data) {
        return
      }

      if (isPage && config.main.beautify.useHtml) {
        data = beautify.html(data, config.main.beautify.htmlOptions)
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
