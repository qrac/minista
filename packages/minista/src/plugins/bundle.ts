import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginGetBundle(): Plugin {
  return {
    name: "minista-vite-plugin:get-bundle",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_plugin_get_bundle: path.join(
              __dirname,
              "/../scripts/bundle.js"
            ),
          },
        },
      },
    }),
  }
}
