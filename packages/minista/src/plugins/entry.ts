import type { Plugin } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import { resolveViteEntry } from "../config/vite.js"

export function pluginEntry(
  config: ResolvedConfig,
  ssgEntries: { [key: string]: string }
): Plugin {
  return {
    name: "minista-vite-plugin:entry",
    config: () => {
      const resolvedViteEntry = resolveViteEntry(
        config.sub.resolvedRoot,
        config.sub.resolvedEntry
      )
      const mergedEntry = { ...resolvedViteEntry, ...ssgEntries }
      return {
        build: {
          rollupOptions: {
            input: mergedEntry,
          },
        },
      }
    },
  }
}
