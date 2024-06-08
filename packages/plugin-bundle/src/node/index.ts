import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginBundleServe } from "./serve.js"
import { pluginBundleBuild } from "./build.js"

export function pluginBundle(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginBundleServe(_opts), pluginBundleBuild(_opts)]
}
