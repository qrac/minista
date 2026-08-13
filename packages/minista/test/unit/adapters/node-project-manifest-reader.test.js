import fs from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  NodeProjectManifestReader,
  ProjectManifestNotFoundError,
} from "../../../src/adapters/filesystem/project-manifest-reader.js"
import {
  ProjectManifestInvalidError,
  ProjectManifestVersionUnsupportedError,
} from "../../../src/core/manifest/index.js"

describe("Node project manifest reader", () => {
  test("reports missing, malformed, and unsupported manifests", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-manifest-read-"),
    )
    const directory = path.resolve(root, ".minista")
    const file = path.resolve(directory, "manifest.json")
    try {
      const reader = new NodeProjectManifestReader()
      await expect(reader.read(root)).rejects.toBeInstanceOf(
        ProjectManifestNotFoundError,
      )

      await fs.promises.mkdir(directory)
      await fs.promises.writeFile(file, "{broken", "utf8")
      await expect(reader.read(root)).rejects.toBeInstanceOf(
        ProjectManifestInvalidError,
      )

      await fs.promises.writeFile(
        file,
        JSON.stringify({ schemaVersion: "2" }),
        "utf8",
      )
      await expect(reader.read(root)).rejects.toBeInstanceOf(
        ProjectManifestVersionUnsupportedError,
      )
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
