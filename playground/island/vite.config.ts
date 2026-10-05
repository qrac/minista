import { defineConfig, pluginSsg, pluginIsland } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland()],
  build: {
    //minify: false,
    rolldownOptions: {
      output: {
        //minifyInternalExports: false,
      },
    },
  },
})
