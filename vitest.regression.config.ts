import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./packages/minista/test/regression/**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["**/node_modules/**"],
  },
})
