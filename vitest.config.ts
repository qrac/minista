import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Daily checks only. Build, server, process and regression suites are opt-in.
    include: [
      "./packages/minista/test/{unit,shared,cli,plugins}/**/*.test.{js,jsx,ts,tsx}",
    ],
    exclude: ["**/node_modules/**"],
  },
})
