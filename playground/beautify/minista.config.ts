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
    rollupOptions: {
      output: {
        //minifyInternalExports: false,
      },
    },
  },
  plugins: [pluginSsg(), pluginBundle(), pluginEntry(), pluginBeautify()],
})
