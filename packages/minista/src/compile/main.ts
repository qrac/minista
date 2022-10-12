import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"
import { pluginSsg } from "../plugins/ssg.js"

export async function compileMain(config: ResolvedConfig) {
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [pluginSsg(config)],
    })
  )
  const compileMainConfig = { ...mergedViteConfig }

  compileMainConfig.customLogger = createLogger("warn")

  const result = (await viteBuild(compileMainConfig)) as unknown as BuildResult
  return result.output
}
