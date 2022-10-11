import { preview as vitePreview } from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"

export async function preview(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const viteServer = await vitePreview(config.vite)
  viteServer.printUrls()
}
