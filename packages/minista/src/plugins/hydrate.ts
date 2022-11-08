import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginHydrate(): Plugin {
  return {
    name: "minista-vite-plugin:hydrate",
    config: () => {
      return {
        build: {
          rollupOptions: {
            input: {
              __minista_plugin_hydrate: path.join(
                __dirname,
                "/../server/hydrate.js"
              ),
            },
          },
        },
      }
    },
  }
}
