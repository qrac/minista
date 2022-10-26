import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginGetSsg(): Plugin {
  return {
    name: "minista-vite-plugin:get-ssg",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_plugin_get_ssg: path.join(
              __dirname,
              "/../scripts/ssg.js"
            ),
          },
        },
      },
    }),
  }
}
