import fs from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  ExternalBuildHandoffInvalidError,
  NodeExternalBuildHandoff,
} from "../../../src/adapters/filesystem/external-build-handoff.js"

describe("Node external build handoff", () => {
  test("round-trips a private manifest candidate and clears the build scope", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-handoff-"),
    )
    const manifest = {
      schemaVersion: "1",
      generator: { name: "minista", version: "5.0.0" },
      project: { id: "project:fixture", name: "fixture", root: "." },
      features: [],
      routes: [],
      pages: [],
      assets: [],
      artifacts: [],
      diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    try {
      const handoff = new NodeExternalBuildHandoff()
      const pagesFile = await handoff.writeRenderedPages(
        root,
        "build_test-1",
        [{ url: "/", fileName: "index.html", html: "<h1>Fixture</h1>" }],
      )
      const snippetsFile = await handoff.writeIslandSnippets(
        root,
        "build_test-1",
        ["encoded-snippet"],
      )
      const file = await handoff.write(
        root,
        "build_test-1",
        /** @type {any} */ (manifest),
      )

      expect(file).toContain(".minista/work/build_test-1/external")
      expect(pagesFile.endsWith("rendered-pages.json")).toBe(true)
      expect(snippetsFile.endsWith("island-snippets.json")).toBe(true)
      await expect(handoff.readRenderedPages(root, "build_test-1"))
        .resolves.toEqual([
          { url: "/", fileName: "index.html", html: "<h1>Fixture</h1>" },
        ])
      await expect(handoff.readIslandSnippets(root, "build_test-1"))
        .resolves.toEqual(["encoded-snippet"])
      await expect(handoff.read(root, "build_test-1")).resolves.toMatchObject({
        project: { name: "fixture" },
      })
      await handoff.clear(root, "build_test-1")
      await expect(handoff.read(root, "build_test-1")).resolves.toBeUndefined()
      await expect(handoff.clear(root, "../escape")).rejects.toThrow(TypeError)

      await fs.promises.mkdir(
        path.resolve(root, ".minista/work/broken/external"),
        { recursive: true },
      )
      await fs.promises.writeFile(
        path.resolve(
          root,
          ".minista/work/broken/external/rendered-pages.json",
        ),
        "not json",
        "utf8",
      )
      await expect(handoff.readRenderedPages(root, "broken")).rejects
        .toBeInstanceOf(ExternalBuildHandoffInvalidError)
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
