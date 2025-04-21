import { defineConfig, pluginSsg, pluginBundle, pluginBeautify } from "minista"

export default defineConfig({
  build: {
    minify: false,
    assetsInlineLimit: 0,
  },
  plugins: [pluginSsg(), pluginBundle(), pluginBeautify()],
})
