import { defineConfig } from "vitest/config"
import pluginReact from "@vitejs/plugin-react"

export default defineConfig({
  test: {
    include: ["./packages/minista/test/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "./playground/**/*.*"],
    testTimeout: 20000,
  },
  plugins: [pluginReact()],
  esbuild: {
    //target: "node14",
  },
})
