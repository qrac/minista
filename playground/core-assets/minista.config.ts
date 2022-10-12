import { defineConfig } from "minista"

export default defineConfig({
  assets: {
    entry: ["src/assets/style-entry.css", "src/assets/script-entry.ts"],
  },
})
