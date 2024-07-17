import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginArchiveBuild } from "./build.js"

export function pluginArchive(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = { ...defaultOptions, ...opts }
  return [pluginArchiveBuild(_opts)]
}
