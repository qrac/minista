import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions, mergeArchiveItem } from "./option.js"
import { pluginArchiveBuild } from "./build.js"

export function pluginArchive(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = {
    archives: opts.archives?.map(mergeArchiveItem) ?? defaultOptions.archives,
  }
  return [pluginArchiveBuild(_opts)]
}
