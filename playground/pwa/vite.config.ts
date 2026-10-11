import { defineConfig, pluginSsg, pluginPwa } from "minista"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginPwa({
      registerType: "autoUpdate",
      manifest: {
        name: "minista PWA playground",
        short_name: "Minista PWA",
        theme_color: "#182433",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,svg,png,json}"],
        navigateFallback: null,
      },
    }),
  ],
})
