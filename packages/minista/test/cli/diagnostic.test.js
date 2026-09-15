import { describe, expect, test, vi } from "vitest"

import {
  createConfigConflictDiagnostic,
  createRemovedOptionDiagnostic,
  reportCliDiagnostic,
} from "../../src/cli/utils/diagnostic.js"

describe("CLI diagnostics", () => {
  test("creates a structured config conflict error", () => {
    const diagnostic = createConfigConflictDiagnostic([
      "vite.config.js",
      "minista.config.js",
    ])

    expect(diagnostic).toEqual({
      code: "MINISTA_CLI_CONFIG_CONFLICT",
      severity: "error",
      message:
        "Error: Multiple config files were found.\n\n" +
        "  vite.config.js\n" +
        "  minista.config.js\n\n" +
        "Please remove one of them. `vite.config.js` is recommended.",
    })
  })

  test("creates and reports a structured removed option error", () => {
    const diagnostic = createRemovedOptionDiagnostic("--oneBuild")
    const output = vi.spyOn(console, "error").mockImplementation(() => {})

    reportCliDiagnostic(diagnostic)

    expect(diagnostic).toEqual({
      code: "MINISTA_CLI_OPTION_REMOVED",
      severity: "error",
      message: expect.stringContaining("--oneBuild"),
      hint: expect.stringContaining("minista build"),
    })
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining("[MINISTA_CLI_OPTION_REMOVED]"),
    )
    output.mockRestore()
  })
})
