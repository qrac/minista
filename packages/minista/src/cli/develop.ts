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
import { pluginPreact } from "../plugins/preact.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginSprite } from "../plugins/sprite.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginServe } from "../plugins/serve.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginSearch } from "../plugins/search.js"

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      optimizeDeps: {
        exclude: ["minista"],
        include: [
          "react-helmet-async",
          "dayjs",
          "dayjs/plugin/utc.js",
          "dayjs/plugin/timezone.js",
        ],
      },
      plugins: [
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config.mdx) as PluginOption,
        pluginSvgr(config),
        pluginSprite(config, true),
        pluginFetch(config),
        pluginServe(config),
        pluginPartial(config),
        pluginSearch(config),
      ],
    })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}
