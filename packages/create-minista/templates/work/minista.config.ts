import {
  defineConfig,
  pluginSsg,
  pluginEntry,
  //pluginSprite,
  //pluginIsland,
  pluginBeautify,
  pluginArchive,
} from "minista"
import react from "@vitejs/plugin-react-oxc"

const common = defineConfig({
  plugins: [
    pluginSsg(),
    pluginEntry(),
    //pluginSprite(),
    //pluginIsland(),
    pluginBeautify(),
    pluginArchive({
      archives: [
        {
          srcDir: "dist",
          outName: "dist",
        },
        {
          srcDir: "src",
          outName: "src",
        },
      ],
    }),
    react(),
  ],
})

const preactAlias = [
  {
    find: "react",
    replacement: "preact/compat",
  },
  {
    find: "react-dom",
    replacement: "preact/compat",
  },
]

export default defineConfig(({ command, isSsrBuild }) => {
  if (command === "serve") return { ...common }
  if (command === "build" && isSsrBuild) return { ...common }
  if (command === "build" && !isSsrBuild) {
    return {
      ...common,
      build: {
        minify: false,
        rollupOptions: {
          output: {
            /*advancedChunks: {
              groups: [
                //{ name: "react", test: /\/react(?:-dom)\// },
                //{ name: "react", test: /\/react\// },
                //{ name: "react-dom", test: /\/react-dom\// },
                { name: "preact", test: /\/preact\// },
                { name: "minista", test: /\/minista\/src\// },
              ],
            },*/
          },
        },
      },
      resolve: {
        //alias: preactAlias,
      },
    }
  }
  return { ...common }
})
