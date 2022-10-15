import type { RollupOutput } from "rollup"
import path from "node:path"
import fs from "fs-extra"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { pluginPages } from "../plugins/pages.js"
import { pluginAssets } from "../plugins/assets.js"
import { generatePages } from "../generate/pages.js"
import { generateAssets } from "../generate/assets.js"

export type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const resolvedOut = path.join(config.sub.resolvedRoot, config.main.out)
  const resolvedPublic = path.join(config.sub.resolvedRoot, config.main.public)
  const hasPublic = await fs.pathExists(resolvedPublic)

  const pagesConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false, ssr: true, minify: false },
      plugins: [pluginPages()],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  const assetsConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [pluginAssets()],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  let pagesResult: BuildResult
  let assetsResult: BuildResult

  await Promise.all([
    (pagesResult = (await viteBuild(pagesConfig)) as unknown as BuildResult),
    (assetsResult = (await viteBuild(assetsConfig)) as unknown as BuildResult),
  ])

  await fs.emptyDir(resolvedOut)
  hasPublic && (await fs.copy(resolvedPublic, resolvedOut))

  const bundleName = path.join(
    config.main.assets.outDir,
    config.main.assets.bundle.outName + ".css"
  )
  const bugName = path.join(config.main.assets.outDir, "assets.css")
  const hasBundle = assetsResult.output.some(
    (item) => item.fileName === bundleName || item.fileName === bugName
  )

  await Promise.all([
    await generatePages({
      config,
      items: pagesResult.output,
      hasBundle,
    }),
    await generateAssets({
      config,
      items: assetsResult.output,
      bundleName,
      bugName,
    }),
  ])
  return
}
