import { describe, expect, test } from "vitest"

import {
  createOutputManifest,
  OutputFileConflictError,
} from "../../../src/core/manifest/index.js"

describe("Output manifest", () => {
  test("sorts and freezes normalized output files", () => {
    const manifest = createOutputManifest("client", [
      {
        logicalId: "app",
        kind: "chunk",
        fileName: "scripts/app.js",
        url: "/scripts/app.js",
        byteSize: 4,
        imports: ["scripts/shared.js"],
      },
      {
        logicalId: "index.html",
        kind: "asset",
        fileName: "index.html",
        url: "/index.html",
        byteSize: 20,
      },
    ])

    expect(manifest.files.map(({ fileName }) => fileName)).toEqual([
      "index.html",
      "scripts/app.js",
    ])
    expect(Object.isFrozen(manifest)).toBe(true)
    expect(Object.isFrozen(manifest.files[1]?.imports)).toBe(true)
  })

  test("rejects duplicate output file names with a stable code", () => {
    const duplicate = {
      logicalId: "duplicate",
      kind: /** @type {const} */ ("asset"),
      fileName: "index.html",
      url: "/index.html",
      byteSize: 1,
    }
    expect(() => createOutputManifest("client", [duplicate, duplicate]))
      .toThrowError(OutputFileConflictError)
    try {
      createOutputManifest("client", [duplicate, duplicate])
    } catch (error) {
      expect(error).toMatchObject({ code: "MINISTA_OUTPUT_FILE_CONFLICT" })
    }
  })
})
