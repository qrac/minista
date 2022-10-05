import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./packages/minista/test/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "./playground/**/*.*"],
    testTimeout: 20000,
  },
  esbuild: {
    //target: "node14",
  },
})
