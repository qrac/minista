import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginPages(): Plugin {
  return {
    name: "minista-vite-plugin:pages",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_gather_pages: path.join(__dirname, "/../gather/pages.js"),
          },
        },
      },
    }),
  }
}
