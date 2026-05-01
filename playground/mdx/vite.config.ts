import { defineConfig, pluginSsg, pluginMdx } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginMdx()],
})
