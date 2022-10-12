import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function compileBundle(config: ResolvedConfig) {
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
    })
  )
  const compileBundleConfig = { ...mergedViteConfig }

  compileBundleConfig.build.rollupOptions.input = {
    __minista_bundle_assets: path.join(__dirname, "/../server/bundle.js"),
  }
  compileBundleConfig.customLogger = createLogger("warn")

  const result = (await viteBuild(
    compileBundleConfig
  )) as unknown as BuildResult
  return result.output
}
