import { defineConfig, pluginSsg, pluginEntry } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginEntry()],
})
