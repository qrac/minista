import { defineConfig, pluginSsg, pluginIsland, pluginSearch } from "minista"
import react from "@vitejs/plugin-react-oxc"

const common = defineConfig({
  plugins: [pluginSsg(), pluginIsland(), pluginSearch(), react()],
})

export default defineConfig(({ command, isSsrBuild }) => {
  if (command === "serve") return { ...common }
  if (command === "build" && isSsrBuild) return { ...common }
  if (command === "build" && !isSsrBuild) {
    return {
      ...common,
      build: {
        minify: false,
        //outDir: "dest",
        rollupOptions: {
          output: {
            //minifyInternalExports: false,
            /*manualChunks: {
              //vender: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
              react: ["react", "react/jsx-runtime"],
              "react-dom": ["react-dom", "react-dom/client"],
              minista: ["minista/assets"],
            },*/
            advancedChunks: {
              groups: [
                //{ name: "react", test: /\/react(?:-dom)\// },
                { name: "react", test: /\/react\// },
                { name: "react-dom", test: /\/react-dom\// },
                { name: "minista", test: /\/minista\/src\// },
              ],
            },
          },
        },
      },
    }
  }
  return { ...common }
})
