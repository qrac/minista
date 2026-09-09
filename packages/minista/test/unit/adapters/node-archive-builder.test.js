import { describe, expect, test } from "vitest"

import {
  NodeArchiveBuilder,
  NodeArchiveError,
} from "../../../src/adapters/archive/index.js"

describe("Node archive builder", () => {
  test("normalizes Archiver failures into a structured diagnostic", async () => {
    const builder = new NodeArchiveBuilder(process.cwd())

    await expect(builder.build({
      srcDir: ".",
      outName: "site",
      format: "zip",
      options: /** @type {any} */ ({ statConcurrency: 0 }),
    })).rejects.toMatchObject({
      code: "MINISTA_ARCHIVE_FAILED",
      name: NodeArchiveError.name,
      format: "zip",
      sourceDirectory: ".",
      diagnostic: {
        code: "MINISTA_ARCHIVE_FAILED",
        severity: "error",
        phase: "finalize",
        feature: "feature:archive",
      },
    })
  })
})

// Publication owns the staging file, including failures after streaming completes.
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { vi } from "vitest"
import { NodeArchivePublisher } from "../../../src/adapters/archive/node.js"

for (const format of /** @type {const} */ (["zip", "tar"])) {
  test(`${format}: streaming preserves bytes and removes staging files`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "minista-archive-"))
    try {
      await fs.mkdir(path.join(root, "input"))
      await fs.writeFile(path.join(root, "input/data"), Buffer.alloc(1024 * 1024, 37))
      const options = { srcDir: "input", outName: "site", format }
      const bytes = await new NodeArchiveBuilder(root).build(options)
      const target = path.join(root, "input/site." + format)
      const publisher = new NodeArchivePublisher(root, path.join(root, "input"), [target])
      for (let i = 0; i < 2; i++) {
        await publisher.publish(options, "site." + format)
        expect(await fs.readFile(target)).toEqual(Buffer.from(bytes))
        expect(await fs.readdir(path.join(root, "input"))).toEqual(["data", "site." + format])
      }
      // Rename failure after all bytes have been written must clean up the staging file.
      const rename = vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("rename failed"))
      await expect(publisher.publish(options, "site." + format)).rejects.toMatchObject({ code: "MINISTA_ARCHIVE_FAILED" })
      rename.mockRestore()
      expect(await fs.readFile(target)).toEqual(Buffer.from(bytes))
      expect(await fs.readdir(path.join(root, "input"))).toEqual(["data", "site." + format])
      await expect(publisher.publish(options, "../escape.zip")).rejects.toMatchObject({ code: "MINISTA_OUTPUT_WRITE_UNSAFE_PATH" })
      // An actual destination stream error must settle without an unhandled error.
      await expect(new NodeArchiveBuilder(root).write(options, target)).rejects.toMatchObject({ code: "MINISTA_ARCHIVE_FAILED" })
      const write = vi.spyOn(NodeArchiveBuilder.prototype, "write").mockImplementationOnce(async (_, temporary) => {
        await fs.writeFile(temporary, "partial")
        throw new Error("write failed")
      })
      await expect(publisher.publish(options, "site." + format)).rejects.toMatchObject({ code: "MINISTA_ARCHIVE_FAILED" })
      write.mockRestore()
      expect(await fs.readdir(path.join(root, "input"))).toEqual(["data", "site." + format])
      expect(await fs.readFile(target)).toEqual(Buffer.from(bytes))
    } finally {
      vi.restoreAllMocks()
      await fs.rm(root, { recursive: true, force: true })
    }
  })
}
