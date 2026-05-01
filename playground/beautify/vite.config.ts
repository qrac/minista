import {
  defineConfig,
  pluginSsg,
  pluginBundle,
  pluginEntry,
  pluginBeautify,
} from "minista"

export default defineConfig({
  build: {
    minify: false,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        //minifyInternalExports: false,
      },
    },
  },
  plugins: [pluginSsg(), pluginBundle(), pluginEntry(), pluginBeautify()],
})
