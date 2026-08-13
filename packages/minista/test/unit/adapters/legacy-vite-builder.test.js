import fs from "node:fs"
import path from "node:path"

import { describe, expect, test, vi } from "vitest"

import {
  LegacyViteBuilderAdapter,
  ViteEnvironmentNotFoundError,
} from "../../../src/adapters/vite/legacy-builder.js"
import {
  attachViteBuildSession,
  createViteBuildSession,
} from "../../../src/adapters/vite/build-session.js"

describe("legacy Vite Builder adapter", () => {
  test("builds the single legacy environment through createBuilder", async () => {
    const environment = { name: "ssr", config: { build: {} } }
    const build = vi.fn(async () => ({ output: [] }))
    const factory = vi.fn(async () => ({
      environments: { ssr: environment },
      build,
    }))
    const adapter = new LegacyViteBuilderAdapter(
      /** @type {any} */ (factory),
    )
    const config = { build: { ssr: true } }

    await adapter.build(config)

    expect(factory).toHaveBeenCalledWith(config, true)
    expect(build).toHaveBeenCalledWith(environment)
  })

  test("fails with a stable code when Vite creates no environment", async () => {
    const adapter = new LegacyViteBuilderAdapter(
      /** @type {any} */ (async () => ({ environments: {} })),
    )

    await expect(adapter.build({})).rejects.toMatchObject({
      code: "MINISTA_VITE_ENVIRONMENT_NOT_FOUND",
      name: ViteEnvironmentNotFoundError.name,
    })
  })

  test("restores output when the legacy client fallback fails", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-legacy-rollback-"),
    )
    const outDir = path.resolve(root, "dist")
    try {
      await fs.promises.mkdir(outDir)
      await fs.promises.writeFile(path.resolve(outDir, "stable.html"), "stable")
      const environment = {
        name: "client",
        config: { root, build: { write: true, outDir: "dist" } },
      }
      const adapter = new LegacyViteBuilderAdapter(
        /** @type {any} */ (async () => ({
          environments: { client: environment },
          async build() {
            await fs.promises.mkdir(outDir)
            await fs.promises.writeFile(
              path.resolve(outDir, "partial.html"),
              "partial",
            )
            throw new Error("legacy client failed")
          },
        })),
      )

      await expect(adapter.build({ build: { ssr: false } }))
        .rejects.toThrow("legacy client failed")
      await expect(
        fs.promises.readFile(path.resolve(outDir, "stable.html"), "utf8"),
      ).resolves.toBe("stable")
      await expect(
        fs.promises.access(path.resolve(outDir, "partial.html")),
      ).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })

  test("writes diagnostics after a successful legacy client build", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-legacy-metadata-"),
    )
    try {
      const environment = {
        name: "client",
        config: { root, build: { write: true, outDir: "dist" } },
      }
      const adapter = new LegacyViteBuilderAdapter(
        /** @type {any} */ (async () => ({
          environments: { client: environment },
          async build() {
            await fs.promises.mkdir(path.resolve(root, "dist"))
            return { output: [] }
          },
        })),
      )
      const session = createViteBuildSession({ buildId: "build:legacy" })

      await adapter.build(attachViteBuildSession(
        { root, build: { ssr: false } },
        session,
      ))

      const report = JSON.parse(await fs.promises.readFile(
        path.resolve(root, ".minista/diagnostics.json"),
        "utf8",
      ))
      expect(report).toMatchObject({
        command: "build",
        buildId: "build:legacy",
        summary: { errors: 0 },
      })
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })
})
