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
import { pluginGetSsg } from "../plugins/ssg.js"
import { pluginPartial, pluginGetPartial } from "../plugins/partial.js"
import { pluginGetBundle } from "../plugins/bundle.js"
import { generateHtml } from "../generate/html.js"
import { generateAssets } from "../generate/assets.js"
import { generatePartial } from "../generate/partial.js"

export type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const ssgConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false, ssr: true, minify: false },
      plugins: [pluginGetSsg(), pluginPartial(config)],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  const assetsConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [pluginGetBundle()],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  const partialConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [pluginGetPartial(config)],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  const hasPartial = fs.existsSync(path.join(config.sub.tempDir, "partials"))

  let ssgResult: BuildResult
  let assetsResult: BuildResult
  let partialResult: BuildResult

  await Promise.all([
    (ssgResult = (await viteBuild(ssgConfig)) as unknown as BuildResult),
    (assetsResult = (await viteBuild(assetsConfig)) as unknown as BuildResult),
  ])

  if (hasPartial) {
    partialResult = (await viteBuild(partialConfig)) as unknown as BuildResult
  } else {
    partialResult = { output: [] }
  }

  const resolvedOut = path.join(config.sub.resolvedRoot, config.main.out)
  const resolvedPublic = path.join(config.sub.resolvedRoot, config.main.public)
  const hasPublic = fs.existsSync(resolvedPublic)

  await fs.emptyDir(resolvedOut)
  hasPublic && (await fs.copy(resolvedPublic, resolvedOut))

  const bundleCssName = path.join(
    config.main.assets.outDir,
    config.main.assets.bundle.outName + ".css"
  )
  const bugBundleCssName = path.join(config.main.assets.outDir, "bundle.css")
  const hasBundleCss = assetsResult.output.some(
    (item) =>
      item.fileName === bundleCssName || item.fileName === bugBundleCssName
  )

  await Promise.all([
    await generateHtml({
      config,
      items: ssgResult.output,
      hasBundleCss,
    }),
    await generateAssets({
      config,
      items: assetsResult.output,
    }),
    hasPartial &&
      (await generatePartial({
        config,
        items: partialResult.output,
      })),
  ])
  return
}
