import react from "@vitejs/plugin-react"
import {
  defineConfig,
  pluginArchive,
  pluginBeautify,
  pluginComment,
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
    pluginIsland(),
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
        minify: false,
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "scripts/[name].js",
        entryFileNames: "scripts/[name].js",
      },
    },
  },
})
