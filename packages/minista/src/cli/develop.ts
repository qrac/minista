import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { pluginReact } from "../plugins/react.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginMdx } from "../plugins/mdx.js"
import { pluginImage } from "../plugins/image.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginIcon } from "../plugins/icon.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginServe } from "../plugins/serve.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginSearch } from "../plugins/search.js"

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      plugins: [
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config),
        pluginImage(config),
        pluginSvgr(config),
        pluginIcon(config),
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
