import type { Plugin } from "vite"

import type { UserPluginOptions, PluginOptions } from "./option.js"
import { defaultOptions } from "./option.js"
import { pluginHydrateServe } from "./serve.js"
import { pluginHydrateBuild } from "./build.js"

export function pluginHydrate(opts: UserPluginOptions = {}): Plugin[] {
  const _opts: PluginOptions = {
    ...defaultOptions,
    ...opts,
    intersectionObserverOptions: {
      ...defaultOptions.intersectionObserverOptions,
      ...opts.intersectionObserverOptions,
    },
  }
  return [pluginHydrateServe(_opts), pluginHydrateBuild(_opts)]
}
