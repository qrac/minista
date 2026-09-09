import {
  defineConfig,
  pluginSsg,
  pluginEntry,
  pluginBeautify,
} from "minista"

export default defineConfig({
  build: {
    minify: false,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        minify: false,
        assetFileNames: "assets/[name][extname]",
        //minifyInternalExports: false,
      },
    },
  },
  plugins: [pluginSsg(), pluginEntry(), pluginBeautify()],
})
