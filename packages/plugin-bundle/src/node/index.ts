import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginBundleBuild } from "./build.js"

export function pluginBundle(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...opts, ...defaultOptions }
  return [pluginBundleBuild(_opts)]
}
