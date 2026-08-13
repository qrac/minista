import fs from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

import { NodeProjectManifestWriter } from "../../../src/adapters/filesystem/project-manifest-writer.js"

describe("Node project manifest writer", () => {
  test("atomically replaces the public manifest without pending files", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-manifest-"),
    )
    const base = {
      schemaVersion: "1",
      generator: { name: "minista", version: "5.0.0" },
      project: { id: "project:fixture", name: "fixture", root: "." },
      features: [],
      routes: [],
      pages: [],
      assets: [],
      artifacts: [],
      diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    try {
      const writer = new NodeProjectManifestWriter()
      const file = await writer.write(root, /** @type {any} */ (base))
      await writer.write(root, /** @type {any} */ ({
        ...base,
        createdAt: "2026-08-13T01:00:00.000Z",
      }))

      const manifest = JSON.parse(await fs.promises.readFile(file, "utf8"))
      expect(file).toBe(path.resolve(root, ".minista/manifest.json"))
      expect(manifest.createdAt).toBe("2026-08-13T01:00:00.000Z")
      expect(await fs.promises.readdir(path.dirname(file))).toEqual([
        "manifest.json",
      ])
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
