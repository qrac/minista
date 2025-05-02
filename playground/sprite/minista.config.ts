import { defineConfig, pluginSsg, pluginSprite } from "minista"

export default defineConfig({
  /*build: {
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },*/
  plugins: [pluginSsg(), pluginSprite()],
})
