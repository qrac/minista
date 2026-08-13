import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { describe, expect, test, vi } from "vitest"

import {
  createRemovedOptionDiagnostic,
  reportCliDiagnostic,
} from "../../src/cli/utils/diagnostic.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const binFile = path.resolve(packageDir, "bin/minista.js")

/** @param {string[]} args */
function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binFile, ...args], {
      cwd: packageDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout, stderr }))
  })
}

describe("CLI diagnostics", () => {
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

  test("rejects --oneBuild and keeps the current CLI path unchanged", async () => {
    const removed = await runCli(["--version", "--oneBuild"])
    const current = await runCli(["--version"])

    expect(removed).toMatchObject({ code: 1 })
    expect(removed.stderr).toContain(
      "[MINISTA_CLI_OPTION_REMOVED]",
    )
    expect(current).toMatchObject({ code: 0 })
    expect(current.stderr).not.toContain(
      "MINISTA_CLI_OPTION_REMOVED",
    )
  })
})
