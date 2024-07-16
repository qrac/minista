import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginBeautifyBuild } from "./build.js"

export function pluginBeautify(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = {
    ...defaultOptions,
    ...opts,
    htmlOptions: {
      ...defaultOptions.htmlOptions,
      ...opts.htmlOptions,
    },
    cssOptions: {
      ...defaultOptions.cssOptions,
      ...opts.cssOptions,
    },
    jsOptions: {
      ...defaultOptions.jsOptions,
      ...opts.jsOptions,
    },
  }
  return [pluginBeautifyBuild(_opts)]
}
