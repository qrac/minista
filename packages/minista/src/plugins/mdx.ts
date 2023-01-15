import type { PluginOption } from "vite"
import type { Options as MdxOptions } from "@mdx-js/rollup"
import mdxjsRollup from "@mdx-js/rollup"

export function pluginMdx(options: MdxOptions = {}): PluginOption {
  return mdxjsRollup(options)
}
