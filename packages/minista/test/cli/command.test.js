import { describe, expect, test } from "vitest"

import {
  canRunProgrammaticBuild,
  canRunProgrammaticDev,
  isDevCommand,
} from "../../src/cli/utils/command.js"

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

describe("programmatic dev command", () => {
  test("accepts common Vite dev flags", () => {
    expect(isDevCommand(["dev", "./site", "--host", "127.0.0.1"]))
      .toBe(true)
    expect(isDevCommand(["./site", "--port", "3000"])).toBe(true)
    expect(
      canRunProgrammaticDev([
        "dev",
        "./site",
        "--host",
        "127.0.0.1",
        "--port=3000",
        "--strictPort",
        "--force",
      ]),
    ).toBe(true)
  })

  test("keeps utility commands and unsupported flags on the Vite CLI", () => {
    expect(isDevCommand(["--version"])).toBe(false)
    expect(isDevCommand(["preview", "./site"])).toBe(false)
    expect(canRunProgrammaticDev(["dev", "--https"])).toBe(false)
  })
})
