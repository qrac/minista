import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginSpriteServe } from "./serve.js"
import { pluginSpriteBuild } from "./build.js"

export function pluginSprite(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginSpriteServe(_opts), pluginSpriteBuild(_opts)]
}
