import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginMdx } from "minista-plugin-mdx"
import { pluginStory } from "minista-plugin-story"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [pluginSsg(), pluginMdx(), pluginStory(), pluginCustom()],
})

function pluginCustom(): Plugin {
  let viteCommand: "build" | "serve"
  let isSsr = false

  return {
    name: "vite-plugin:custom",
    config: (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      if (viteCommand === "serve" || (viteCommand === "build" && !isSsr)) {
        return {
          build: {
            rollupOptions: {
              input: {
                app: path.join(__dirname, "index.html"),
              },
            },
          },
        }
      }
    },
  }
}
