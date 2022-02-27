import { preview } from "vite"
import type { InlineConfig } from "vite"

export async function serveLocal(viteConfig: InlineConfig) {
  const server = await preview(viteConfig)
  server.printUrls()
}
