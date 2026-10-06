import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { afterEach, expect, test } from "vitest"
import { resolveWorkspaceDirectory } from "../../../src/adapters/filesystem/workspace-directory.js"
import { getTempDir } from "../../../src/shared/path.js"
import { NodeAtomicWorkspaceWriter } from "../../../src/adapters/filesystem/atomic-workspace-writer.js"
import { NodeProjectManifestReader } from "../../../src/adapters/filesystem/project-manifest-reader.js"
import { NodeExternalBuildHandoff } from "../../../src/adapters/filesystem/external-build-handoff.js"

/** @type {string[]} */
const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})
test.each([false, true])("unifies snapshots and handoff independently of cwd (package.json: %s)", async (hasPackage) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "minista-workspace-"))
  roots.push(root)
  const child = path.join(root, "site")
  await fs.mkdir(child)
  await fs.writeFile(path.join(root, "package.json"), "{}")
  if (hasPackage) await fs.writeFile(path.join(child, "package.json"), "{}")
  const directory = path.join(child, hasPackage ? "node_modules/.minista" : ".minista")
  expect(resolveWorkspaceDirectory(child)).toBe(directory)
  expect(getTempDir(root, child)).toBe(directory)
  expect(getTempDir(os.tmpdir(), child)).toBe(directory)
  await expect(fs.stat(directory)).rejects.toMatchObject({ code: "ENOENT" })
  expect(await new NodeAtomicWorkspaceWriter().write(child, "diagnostics.json", "{}\n")).toBe(path.join(directory, "diagnostics.json"))
  const handoff = new NodeExternalBuildHandoff()
  const file = await handoff.writeRenderedPages(child, "build-1", [])
  expect(file).toBe(path.join(directory, "work/build-1/external/rendered-pages.json"))
  expect(await handoff.readRenderedPages(child, "build-1")).toEqual([])
  await handoff.clear(child, "build-1")
  await expect(fs.stat(path.join(directory, "work"))).rejects.toMatchObject({ code: "ENOENT" })
  if (hasPackage) {
    await fs.mkdir(path.join(child, ".minista"))
    await fs.writeFile(path.join(child, ".minista/manifest.json"), "{}")
  }
  await expect(new NodeProjectManifestReader().read(child)).rejects.toMatchObject({ code: "MINISTA_MANIFEST_NOT_FOUND" })
  await fs.writeFile(path.join(directory, "manifest.json"), "{}")
  await expect(new NodeProjectManifestReader().read(child)).rejects.toMatchObject({ code: "MINISTA_MANIFEST_INVALID" })
})
