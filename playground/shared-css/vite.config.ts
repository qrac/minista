import { defineConfig, pluginSsg, pluginBundle, pluginEntry } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginBundle(), pluginEntry()],
})
