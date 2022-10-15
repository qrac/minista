import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginAssets(): Plugin {
  return {
    name: "minista-vite-plugin:assets",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_gather_assets: path.join(
              __dirname,
              "/../gather/assets.js"
            ),
          },
        },
      },
    }),
  }
}
