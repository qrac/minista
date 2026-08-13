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

  test("applies an injected migration registry before parsing", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-manifest-migrate-"),
    )
    try {
      const directory = path.resolve(root, ".minista")
      await fs.promises.mkdir(directory)
      await fs.promises.writeFile(
        path.resolve(directory, "manifest.json"),
        JSON.stringify({
          schemaVersion: "0",
          generator: { name: "minista", version: "4.0.0" },
          project: { id: "project:fixture", name: "fixture" },
          features: [],
          routes: [],
          pages: [],
          assets: [],
          artifacts: [],
          diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
          createdAt: "2026-08-13T00:00:00.000Z",
        }),
        "utf8",
      )
      const reader = new NodeProjectManifestReader([{
        from: "0",
        to: "1",
        migrate(value) {
          const project = /** @type {Record<string, unknown>} */ (value.project)
          return {
            ...value,
            schemaVersion: "1",
            project: { ...project, root: "." },
          }
        },
      }])

      await expect(reader.read(root)).resolves.toMatchObject({
        schemaVersion: "1",
        project: { name: "fixture", root: "." },
      })
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
