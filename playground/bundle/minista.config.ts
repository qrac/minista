import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginBundle } from "minista-plugin-bundle"

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [pluginSsg(), pluginBundle()],
})
