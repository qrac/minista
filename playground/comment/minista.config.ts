import { defineConfig, pluginSsg, pluginComment } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginComment()],
})
