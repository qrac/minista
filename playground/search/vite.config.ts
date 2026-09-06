import { defineConfig, pluginSsg, pluginIsland, pluginSearch } from "minista"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"

const preactAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
}

function pluginClientPreactAlias(): Plugin {
  return {
    name: "minista-playground:client-preact-alias",
    enforce: "pre",
    apply: "build",
    applyToEnvironment: (environment) =>
      environment.config.consumer === "client",
    resolveId(source, importer, options) {
      for (const [find, replacement] of Object.entries(preactAlias)) {
        if (source !== find && !source.startsWith(`${find}/`)) continue
        const resolvedSource = `${replacement}${source.slice(find.length)}`
        return this.resolve(resolvedSource, importer, {
          ...options,
          skipSelf: true,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginIsland(),
    pluginSearch(),
    pluginClientPreactAlias(),
    react(),
  ],
  environments: {
    client: {
      build: {
        minify: false,
        //outDir: "dest",
        rolldownOptions: {
          output: {
            //minifyInternalExports: false,
            /*manualChunks: {
              //vender: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
              react: ["react", "react/jsx-runtime"],
              "react-dom": ["react-dom", "react-dom/client"],
              minista: ["minista/assets"],
            },*/
            codeSplitting: {
              groups: [
                //{ name: "react", test: /\/react(?:-dom)\// },
                //{ name: "react", test: /\/react\// },
                //{ name: "react-dom", test: /\/react-dom\// },
                { name: "preact", test: /\/preact\// },
                { name: "minista", test: /\/minista\/src\// },
              ],
            },
          },
        },
      },
    },
  },
})
