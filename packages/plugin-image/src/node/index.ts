import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions, mergeOptions } from "./option.js"
import { pluginImageServe } from "./serve.js"
import { pluginImageBuild } from "./build.js"

export function pluginImage(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = mergeOptions(defaultOptions, opts)
  return [pluginImageServe(_opts), pluginImageBuild(_opts)]
}
