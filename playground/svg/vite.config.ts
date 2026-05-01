import { defineConfig, pluginSsg, pluginSvg } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginSvg()],
})
