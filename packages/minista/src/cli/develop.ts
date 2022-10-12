import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { pluginServe } from "../plugins/serve.js"

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({ plugins: [pluginServe(config)] })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}
