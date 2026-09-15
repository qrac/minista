import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "./packages/minista/test/integration/**/*.test.{js,jsx,ts,tsx}",
    ],
    exclude: ["**/node_modules/**"],
    testTimeout: 20000,
  },
})
