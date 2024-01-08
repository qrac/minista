import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginSsgServe } from "./serve.js"
import { pluginSsgBuild } from "./build.js"

export function pluginSsg(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...opts, ...defaultOptions }
  return [pluginSsgServe(_opts), pluginSsgBuild(_opts)]
}
