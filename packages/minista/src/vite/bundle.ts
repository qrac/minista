import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function bundle(): Plugin {
  return {
    name: "minista-vite-plugin:bundle",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_bundle_assets: path.join(
              __dirname,
              "/../server/bundle.js"
            ),
          },
        },
      },
    }),
  }
}
