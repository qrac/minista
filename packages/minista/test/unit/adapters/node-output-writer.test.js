import fs from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, test } from "vitest"

import {
  NodeOutputWriter,
  OutputWriteUnsafePathError,
} from "../../../src/adapters/filesystem/output-writer.js"

/** @type {string[]} */
const roots = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) =>
    fs.promises.rm(root, { recursive: true, force: true })
  ))
})

describe("Node output writer", () => {
  test("writes Core emitted files below the selected output directory", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-output-writer-"),
    )
    roots.push(root)
    const paths = await new NodeOutputWriter().write(root, [{
      fileName: "archives/site.zip",
      content: new Uint8Array([80, 75]),
    }])

    expect(paths).toEqual([path.resolve(root, "archives/site.zip")])
    await expect(fs.promises.readFile(paths[0])).resolves.toEqual(
      Buffer.from([80, 75]),
    )
  })

  test("rejects output paths outside the selected directory", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-output-writer-"),
    )
    roots.push(root)

    await expect(new NodeOutputWriter().write(root, [{
      fileName: "../outside.zip",
      content: new Uint8Array(),
    }])).rejects.toBeInstanceOf(OutputWriteUnsafePathError)
  })
})
