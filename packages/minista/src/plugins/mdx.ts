import type { PluginOption } from "vite"
import mdxjsRollup from "@mdx-js/rollup"

import type { ResolvedConfig } from "../config/index.js"

export function pluginMdx(config: ResolvedConfig): PluginOption {
  return mdxjsRollup(config.mdx)
}
