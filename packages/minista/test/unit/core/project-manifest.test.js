import { describe, expect, test } from "vitest"

import { serializeProjectManifest } from "../../../src/core/manifest/index.js"

describe("Project manifest", () => {
  test("serializes object keys deterministically with a trailing newline", () => {
    const first = {
      schemaVersion: "1",
      generator: { version: "5.0.0", name: "minista" },
      project: { root: ".", name: "fixture", id: "project:fixture" },
      features: [],
      routes: [],
      pages: [{ params: { z: "last", a: "first" } }],
      assets: [],
      artifacts: [],
      diagnosticSummary: { warnings: 0, info: 0, errors: 0 },
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    const second = {
      ...first,
      generator: { name: "minista", version: "5.0.0" },
      project: { id: "project:fixture", name: "fixture", root: "." },
      pages: [{ params: { a: "first", z: "last" } }],
    }

    const serialized = serializeProjectManifest(/** @type {any} */ (first))

    expect(serialized).toBe(
      serializeProjectManifest(/** @type {any} */ (second)),
    )
    expect(serialized.endsWith("\n")).toBe(true)
    expect(serialized.indexOf('"a"')).toBeLessThan(
      serialized.indexOf('"z"'),
    )
  })
})
