import { defineConfig, pluginSsg, pluginIsland } from "minista"
import react from "@vitejs/plugin-react-oxc"

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland(), react()],
  build: {
    //minify: false,
    rollupOptions: {
      output: {
        //minifyInternalExports: false,
      },
    },
  },
})
