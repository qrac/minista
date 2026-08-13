import react from "@vitejs/plugin-react"
import {
  defineConfig,
  pluginArchive,
  pluginBeautify,
  pluginBundle,
  pluginComment,
  pluginEntry,
  pluginImage,
  pluginIsland,
  pluginSearch,
  pluginSsg,
  pluginSprite,
  pluginSvg,
} from "minista"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginImage({ useCache: false, optimize: { format: "png" } }),
    pluginEntry(),
    pluginIsland(),
    pluginBundle(),
    pluginSprite(),
    pluginSearch(),
    pluginComment(),
    pluginSvg(),
    pluginBeautify(),
    pluginArchive(),
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
