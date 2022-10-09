import type { RollupOutput } from "rollup"
import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
} from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { ssg } from "../vite/ssg.js"
import { bundle } from "../vite/bundle.js"

type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [ssg(config), bundle()],
    })
  )
  const result = (await viteBuild(mergedViteConfig)) as unknown as BuildResult
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
      const isBundleJs = item.fileName.match(/__minista_bundle_assets\.js$/)

      let fileName = item.fileName
      isPage && (fileName = item.fileName.replace(/src\/pages\//, ""))

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (isBundleJs) {
        return
      }
      if (!data) {
        return
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
