import { defineConfig, pluginSsg, pluginImage } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginImage({ useCache: true })],
})
