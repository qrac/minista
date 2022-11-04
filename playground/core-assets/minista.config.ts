import { defineConfig } from "minista"

export default defineConfig({
  assets: {
    entry: [
      {
        input: "src/assets/style-entry.css",
        insertPages: "**/*",
      },
      {
        input: "src/assets/script-entry.ts",
        insertPages: {
          include: ["**/*"],
          exclude: ["/about"],
        },
      },
    ],
  },
})
