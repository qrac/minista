import type { Plugin } from "vite"

import type { ResolvedConfig } from "../config/index.js"

export function pluginPreact(config: ResolvedConfig): Plugin {
  let activePreact = false

  const preactAlias = [
    {
      find: "react",
      replacement: "preact/compat",
    },
    {
      find: "react-dom",
      replacement: "preact/compat",
    },
  ]
  return {
    name: "minista-vite-plugin:preact",
    config: () => {
      activePreact = config.main.assets.partial.usePreact

      return {
        resolve: {
          alias: activePreact ? preactAlias : [],
        },
      }
    },
  }
}
