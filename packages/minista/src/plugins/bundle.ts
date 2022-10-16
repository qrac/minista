import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginBundle(): Plugin {
  return {
    name: "minista-vite-plugin:bundle",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_gather_bundle: path.join(
              __dirname,
              "/../gather/bundle.js"
            ),
          },
        },
      },
    }),
  }
}
