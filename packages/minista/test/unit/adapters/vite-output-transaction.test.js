import fs from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, test } from "vitest"

import {
  ViteOutputDirectoryUnsafeError,
  ViteOutputTransaction,
} from "../../../src/adapters/vite/output-transaction.js"

/** @type {string[]} */
const tempDirs = []

async function createTempRoot() {
  const root = await fs.promises.mkdtemp(
    path.resolve(process.env.TMPDIR || "/tmp", "minista-output-transaction-"),
  )
  tempDirs.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) =>
      fs.promises.rm(directory, { recursive: true, force: true }),
    ),
  )
})

describe("Vite output transaction", () => {
  test("restores the previous output after a failed build", async () => {
    const root = await createTempRoot()
    const outDir = path.resolve(root, "dist")
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.resolve(outDir, "stable.html"), "stable")
    const transaction = new ViteOutputTransaction({
      root,
      outDir: "dist",
      buildId: "build:test",
    })

    await transaction.begin()
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.resolve(outDir, "partial.html"), "partial")
    await transaction.rollback()

    await expect(
      fs.promises.readFile(path.resolve(outDir, "stable.html"), "utf8"),
    ).resolves.toBe("stable")
    await expect(
      fs.promises.access(path.resolve(outDir, "partial.html")),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(fs.promises.access(transaction.backupDir))
      .rejects.toMatchObject({ code: "ENOENT" })
  })

  test("commits new output and removes its private backup", async () => {
    const root = await createTempRoot()
    const outDir = path.resolve(root, "dist")
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.resolve(outDir, "old.html"), "old")
    const transaction = new ViteOutputTransaction({
      root,
      outDir: "dist",
      buildId: "build:test",
    })

    await transaction.begin()
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.resolve(outDir, "new.html"), "new")
    await transaction.commit()

    await expect(
      fs.promises.readFile(path.resolve(outDir, "new.html"), "utf8"),
    ).resolves.toBe("new")
    await expect(fs.promises.access(transaction.backupDir))
      .rejects.toMatchObject({ code: "ENOENT" })
  })

  test("rejects project and filesystem roots", async () => {
    const root = await createTempRoot()
    expect(() => new ViteOutputTransaction({ root, outDir: "." }))
      .toThrowError(ViteOutputDirectoryUnsafeError)
    try {
      new ViteOutputTransaction({ root, outDir: path.parse(root).root })
    } catch (error) {
      expect(error).toMatchObject({
        code: "MINISTA_OUTPUT_TRANSACTION_UNSAFE_DIR",
      })
    }
  })
})
