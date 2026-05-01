import { defineConfig, pluginSsg, pluginSprite } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginSprite()],
})
