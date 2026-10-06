import fs from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, test, vi } from "vitest"

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
  vi.restoreAllMocks()
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

  test("preserves external output by default and can roll it back", async () => {
    const parent = await createTempRoot()
    const root = path.join(parent, "project")
    const outDir = path.join(parent, "output")
    await fs.promises.mkdir(root)
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.join(outDir, "keep.txt"), "old")
    const transaction = new ViteOutputTransaction({ root, outDir })
    await transaction.begin()
    expect(await fs.promises.readFile(path.join(outDir, "keep.txt"), "utf8")).toBe("old")
    await fs.promises.writeFile(path.join(outDir, "keep.txt"), "new")
    await transaction.rollback()
    expect(await fs.promises.readFile(path.join(outDir, "keep.txt"), "utf8")).toBe("old")
  })

  test("cleanup failure never rolls back committed output", async () => {
    const root = await createTempRoot()
    const outDir = path.join(root, "dist")
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.join(outDir, "old.txt"), "old")
    const transaction = new ViteOutputTransaction({ root, outDir })
    await transaction.begin()
    await fs.promises.mkdir(outDir)
    await fs.promises.writeFile(path.join(outDir, "new.txt"), "new")
    vi.spyOn(fs.promises, "rm").mockRejectedValueOnce(new Error("cleanup failed"))
    await transaction.commit()
    expect(transaction.cleanupDiagnostic?.code).toBe("MINISTA_OUTPUT_TRANSACTION_CLEANUP_FAILED")
    await transaction.rollback()
    expect(await fs.promises.readFile(path.join(outDir, "new.txt"), "utf8")).toBe("new")
  })

  test("rejects ancestors and symlinks to the project before moving files", async () => {
    const root = await createTempRoot()
    expect(() => new ViteOutputTransaction({ root, outDir: ".." }))
      .toThrowError(ViteOutputDirectoryUnsafeError)
    await fs.promises.symlink(root, path.join(root, "alias"), "dir")
    const transaction = new ViteOutputTransaction({ root, outDir: "alias" })
    await expect(transaction.begin()).rejects.toThrowError(ViteOutputDirectoryUnsafeError)
    expect((await fs.promises.stat(root)).isDirectory()).toBe(true)
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
