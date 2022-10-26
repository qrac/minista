import type { PluginOption } from "vite"
import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"
import { default as pluginReact } from "@vitejs/plugin-react"
import { default as pluginMdx } from "@mdx-js/rollup"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginSpriteInit, pluginSprite } from "../plugins/sprite.js"
import { pluginServe } from "../plugins/serve.js"
import { pluginPartial } from "../plugins/partial.js"

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      plugins: [
        pluginReact(),
        pluginMdx(config.mdx) as PluginOption,
        pluginSvgr(config),
        pluginSpriteInit(config),
        pluginSprite(config),
        pluginServe(config),
        pluginPartial(config),
      ],
    })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}
