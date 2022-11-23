import type { Plugin } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import { resolveViteEntry } from "../config/vite.js"

export function pluginEntry(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:entry",
    config: () => {
      const resolvedViteEntry = resolveViteEntry(
        config.sub.resolvedRoot,
        config.sub.resolvedEntry
      )
      return {
        build: {
          rollupOptions: {
            input: resolvedViteEntry,
          },
        },
      }
    },
  }
}
