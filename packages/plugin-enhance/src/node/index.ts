import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginEnhanceServe } from "./serve.js"
import { pluginEnhanceBuild } from "./build.js"

export function pluginEnhance(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginEnhanceServe(_opts), pluginEnhanceBuild(_opts)]
}
