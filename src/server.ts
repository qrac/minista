import { createServer } from "vite"
import type { InlineConfig } from "vite"

export async function createDevServer(viteConfig: InlineConfig) {
  const server = await createServer(viteConfig)
  await server.listen()

  server.printUrls()
}
