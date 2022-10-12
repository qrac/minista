import type { RollupOutput } from "rollup"
import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
} from "vite"
import beautify from "js-beautify"

import { ResolvedConfig } from "../config/index.js"
import { ssg } from "../plugins/ssg.js"

type GenerateMainBuildResult = {
  output: GenerateMainBuildItem[]
}
type GenerateMainBuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function generateMain(config: ResolvedConfig) {
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [ssg(config)],
    })
  )
  const result = (await viteBuild(
    mergedViteConfig
  )) as unknown as GenerateMainBuildResult

  const items = result.output

  if (!Array.isArray(items)) {
    return
  }
  if (items.length === 0) {
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
