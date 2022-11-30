import { defineConfig } from "minista"

export default defineConfig({
  assets: {
    entry: [
      {
        input: "src/assets/entry.css",
        insertPages: "**/*",
      },
      {
        input: "src/assets/entry.ts",
        insertPages: {
          include: ["**/*"],
          exclude: ["/about"],
        },
      },
    ],
  },
})
