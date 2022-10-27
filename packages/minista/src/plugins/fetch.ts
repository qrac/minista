import type { Plugin } from "vite"
import path from "node:path"
import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"

export function pluginFetch(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:fetch",
    transform(code, id) {
      if (
        picomatch.isMatch(id, [
          path.join(config.sub.resolvedRoot, "src/pages/_global.{tsx,jsx}"),
          path.join(config.sub.resolvedRoot, "src/_global.{tsx,jsx}"),
          path.join(config.sub.resolvedRoot, "src/global.{tsx,jsx}"),
          path.join(config.sub.resolvedRoot, "src/root.{tsx,jsx}"),
          path.join(config.sub.resolvedRoot, "src/pages/**/*.{tsx,jsx,mdx,md}"),
        ])
      ) {
        const hasGetStaticData = code.includes("getStaticData")
        const useAwaitFetch = code.includes("await fetch")
        const useUndiciFetch = code.match(
          /import.*fetch.*from ("|')undici("|')/
        )
        const useNodeFetch = code.match(/import.*from ("|')node-fetch("|')/)

        if (
          hasGetStaticData &&
          useAwaitFetch &&
          !useUndiciFetch &&
          !useNodeFetch
        ) {
          return {
            code: `import { fetch } from "undici"\n` + code,
            map: null,
          }
        }
      }
    },
  }
}
