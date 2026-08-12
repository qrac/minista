import { describe, expect, test } from "vitest"

import { canRunProgrammaticBuild } from "../../src/cli/utils/command.js"

describe("canRunProgrammaticBuild", () => {
  test("accepts the common build arguments handled in one process", () => {
    expect(
      canRunProgrammaticBuild([
        "build",
        "./site",
        "--config",
        "site/vite.config.ts",
        "--mode=production",
        "--base",
        "/docs/",
      ]),
    ).toBe(true)
  })

  test("keeps the Vite CLI fallback for unsupported flags", () => {
    expect(canRunProgrammaticBuild(["build", "--watch"])).toBe(false)
  })
})
