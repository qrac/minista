import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [pluginSsg({ bundle: { outName: "bundle" } })],
})
