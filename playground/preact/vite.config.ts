import { defineConfig, pluginSsg, pluginIsland } from "minista"

import { pluginPreact } from "./.vite-plugins/preact.js"

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland(), pluginPreact()],
})
