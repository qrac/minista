import type { InlineConfig } from "vite"

import { preview } from "vite"

export async function previewLocal(viteConfig: InlineConfig) {
  const server = await preview(viteConfig)

  server.printUrls()
}
