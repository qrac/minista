import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginSvgServe } from "./serve.js"
import { pluginSvgBuild } from "./build.js"

export function pluginSvg(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginSvgServe(_opts), pluginSvgBuild(_opts)]
}
