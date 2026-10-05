import { defineConfig, pluginSsg, pluginIsland, pluginSearch } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland(), pluginSearch()],
})
