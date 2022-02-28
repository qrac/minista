import { preview } from "vite"
import type { InlineConfig } from "vite"

export async function previewLocal(viteConfig: InlineConfig) {
  const server = await preview(viteConfig)
  server.printUrls()
}
