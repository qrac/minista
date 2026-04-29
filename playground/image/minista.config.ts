import { defineConfig, pluginSsg, pluginImage } from "minista"

export default defineConfig({
  plugins: [pluginSsg(), pluginImage({ useCache: true })],
  /*build: {
    rolldownOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          //console.dir(assetInfo, { depth: 3 })
          //console.log(assetInfo.originalFileNames)
          return "assets/[name]-[hash][extname]"
        },
      },
    },
  },*/
})
