export type SystemConfig = {
  temp: {
    out: string
    config: {
      outDir: string
    }
    viteImporter: {
      outDir: string
    }
    partialHydration: {
      outDir: string
    }
    root: {
      outDir: string
    }
    pages: {
      outDir: string
    }
    assets: {
      outDir: string
    }
    icons: {
      outDir: string
    }
    html: {
      outDir: string
    }
    search: {
      outDir: string
    }
  }
}

export const systemConfig: SystemConfig = {
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
    html: {
      outDir: "node_modules/.minista/temp-html-pages",
    },
    search: {
      outDir: "node_modules/.minista/temp-search",
    },
  },
}
