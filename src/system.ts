import type { MinistaSystemConfig } from "./types.js"

export const systemConfig: MinistaSystemConfig = {
  temp: {
    out: "node_modules/.minista",
    config: {
      outDir: "node_modules/.minista/optimized-config",
    },
    viteImporter: {
      outDir: "node_modules/.minista/vite-importer",
    },
    partialHydration: {
      outDir: "node_modules/.minista/partial-hydration",
    },
    root: {
      outDir: "node_modules/.minista/bundled-react-root",
    },
    pages: {
      outDir: "node_modules/.minista/bundled-react-pages",
    },
    assets: {
      outDir: "node_modules/.minista/bundled-react-assets",
    },
    icons: {
      outDir: "node_modules/.minista/svg-sprite-icons",
    },
  },
}
