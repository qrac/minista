import fs from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

import { NodeDiagnosticsWriter } from "../../../src/adapters/filesystem/diagnostics-writer.js"
import { createDiagnosticsReport } from "../../../src/core/diagnostics/index.js"

describe("Node diagnostics writer", () => {
  test("atomically writes stable workspace diagnostics", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-diagnostics-"),
    )
    try {
      const report = createDiagnosticsReport({
        version: "5.0.0",
        command: "build",
        buildId: "build:test",
        diagnostics: [],
        createdAt: "2026-08-13T00:00:00.000Z",
      })
      const file = await new NodeDiagnosticsWriter().write(root, report)
      const source = await fs.promises.readFile(file, "utf8")

      expect(file).toBe(path.resolve(root, ".minista/diagnostics.json"))
      expect(JSON.parse(source)).toMatchObject({
        command: "build",
        buildId: "build:test",
        summary: { errors: 0 },
      })
      expect(source.endsWith("\n")).toBe(true)
      expect(await fs.promises.readdir(path.dirname(file))).toEqual([
        "diagnostics.json",
      ])
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
