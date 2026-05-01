import { defineConfig, pluginSsg, pluginArchive } from "minista"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginArchive({
      archives: [
        {
          srcDir: "dist",
          outName: "dist",
        },
        {
          srcDir: "src",
          outName: "src",
          ignore: "src/pages/nest/*.tsx",
        },
      ],
    }),
  ],
})
