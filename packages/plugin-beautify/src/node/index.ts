import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginBeautifyBuild } from "./build.js"

export function pluginBeautify(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...opts, ...defaultOptions }
  return [pluginBeautifyBuild(_opts)]
}
