import type { Plugin } from "vite"
import mdxjsRollup from "@mdx-js/rollup"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions, resolveMdxOptions } from "./option.js"

export function pluginMdx(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  const mdxOptions = resolveMdxOptions(_opts)
  return [mdxjsRollup(mdxOptions)]
}
