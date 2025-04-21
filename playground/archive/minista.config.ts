import { defineConfig, pluginSsg, pluginArchive } from "minista"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginArchive({
      multiple: [
        { srcDir: "src", outName: "src", ignore: "src/pages/nest/*.tsx" },
      ],
    }),
  ],
})
