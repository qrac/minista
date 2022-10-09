import { preview as vitePreview } from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"

export async function preview(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const server = await vitePreview(config.vite)
  server.printUrls()
}
