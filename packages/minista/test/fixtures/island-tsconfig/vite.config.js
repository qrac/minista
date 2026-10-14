import { defineConfig, pluginIsland, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland()],
  resolve: { tsconfigPaths: true },
})
