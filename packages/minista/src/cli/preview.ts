import {
  preview as vitePreview,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"

export async function preview(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(config.vite, defineViteConfig({}))
  const viteServer = await vitePreview(mergedViteConfig)

  viteServer.printUrls()
}
