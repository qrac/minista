import { defineConfig, pluginSsg, pluginIsland } from "minista"
import { redact } from "@tanstack/redact/vite"

export default defineConfig({
  // Convert browser imports in both dev and build. Minista keeps React for SSG.
  plugins: [
    pluginSsg(),
    pluginIsland(),
    redact({
      preset: "nano",
      features: {
        hydration: true,
      },
    }),
  ],
})
