import { describe, expect, test } from "vitest"

import {
  NodeArchiveBuilder,
  NodeArchiveError,
} from "../../../src/adapters/archive/index.js"

describe("Node archive builder", () => {
  test("normalizes Archiver failures into a structured diagnostic", async () => {
    const builder = new NodeArchiveBuilder(process.cwd())

    await expect(builder.build({
      srcDir: "dist",
      outName: "site",
      format: "zip",
      options: /** @type {any} */ ({ statConcurrency: 0 }),
    })).rejects.toMatchObject({
      code: "MINISTA_ARCHIVE_FAILED",
      name: NodeArchiveError.name,
      format: "zip",
      sourceDirectory: "dist",
      diagnostic: {
        code: "MINISTA_ARCHIVE_FAILED",
        severity: "error",
        phase: "finalize",
        feature: "feature:archive",
      },
    })
  })
})
