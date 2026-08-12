import react from "@vitejs/plugin-react"
import {
  defineConfig,
  pluginComment,
  pluginEntry,
  pluginImage,
  pluginIsland,
  pluginSearch,
  pluginSsg,
} from "minista"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginImage({ useCache: false, optimize: { format: "png" } }),
    pluginEntry(),
    pluginIsland(),
    pluginSearch(),
    pluginComment(),
    react(),
  ],
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "scripts/[name].js",
        entryFileNames: "scripts/[name].js",
      },
    },
  },
})
