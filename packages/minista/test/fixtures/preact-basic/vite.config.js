import react from "@vitejs/plugin-react"
import { defineConfig, pluginIsland, pluginSsg } from "minista"

const preactAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
}

export default defineConfig(({ command, isSsrBuild }) => ({
  plugins: [pluginSsg(), pluginIsland(), react()],
  build: {
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: command === "build" && !isSsrBuild ? preactAlias : undefined,
  },
}))
