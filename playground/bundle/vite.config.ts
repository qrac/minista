import { defineConfig, pluginSsg, pluginBundle } from "minista"

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [pluginSsg(), pluginBundle()],
})
