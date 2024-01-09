import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginStoryServe } from "./serve.js"
import { pluginStoryBuild } from "./build.js"

export function pluginStory(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginStoryServe(_opts), pluginStoryBuild(_opts)]
}
