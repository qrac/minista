import { createServer } from "vite"
import type { InlineConfig } from "vite"

export async function createDevServer(inlineConfig: InlineConfig) {
  const server = await createServer(inlineConfig)
  await server.listen()

  server.printUrls()
}
