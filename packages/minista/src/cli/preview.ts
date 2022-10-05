import { preview as vitePreview } from "vite"

import type { ResolvedConfig, InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"

export async function doPreview(config: ResolvedConfig) {
  const server = await vitePreview(config.vite)
  server.printUrls()
}

export async function preview(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  await doPreview(config)
}
