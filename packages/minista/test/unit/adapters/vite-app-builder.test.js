import fs from "node:fs"
import path from "node:path"

import { describe, expect, test, vi } from "vitest"

import {
  ViteAppBuilderAdapter,
  ViteAppEnvironmentNotFoundError,
} from "../../../src/adapters/vite/app-builder.js"
import {
  attachViteBuildSession,
  createViteBuildSession,
} from "../../../src/adapters/vite/build-session.js"

describe("Vite App Builder adapter", () => {
  test("builds render, prepares client, then builds client", async () => {
    /** @type {string[]} */
    const calls = []
    const render = { name: "render" }
    const client = {
      name: "client",
      config: { base: "/", build: { write: false } },
    }
    const build = vi.fn(async (environment) => {
      calls.push(`build:${environment.name}`)
      return {
        output: [{
          type: "chunk",
          name: environment.name,
          fileName: `${environment.name}.js`,
          code: "export default true",
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
        }],
      }
    })
    const builder = { environments: { render, client }, build }
    const factory = vi.fn(async () => builder)
    const prepareClient = vi.fn(async ({ renderOutput }) => {
      calls.push(`prepare:${renderOutput.output[0].name}`)
    })
    const adapter = new ViteAppBuilderAdapter(/** @type {any} */ (factory))

    const result = await adapter.build(
      attachViteBuildSession(
        { builder: {}, environments: { render: {}, client: {} } },
        createViteBuildSession({ buildId: "build:test" }),
      ),
      { prepareClient },
    )

    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        __ministaAppBuild: {
          renderName: "render",
          clientName: "client",
        },
        builder: {},
        environments: {
          render: { consumer: "server", build: { ssr: true } },
          client: { consumer: "client", build: { ssr: false } },
        },
      }),
      false,
    )
    expect(calls).toEqual(["build:render", "prepare:render", "build:client"])
    expect(result).toMatchObject({
      schemaVersion: "1",
      status: "success",
      buildId: "build:test",
      diagnostics: [],
      environments: {
        render: { name: "render", status: "built" },
        client: { name: "client", status: "built" },
      },
      outputManifest: { schemaVersion: "1", environment: "client" },
    })
  })

  test("reports a missing configured environment with a stable code", async () => {
    const adapter = new ViteAppBuilderAdapter(
      /** @type {any} */ (async () => ({ environments: { client: {} } })),
    )

    await expect(adapter.build({})).rejects.toMatchObject({
      code: "MINISTA_VITE_APP_ENVIRONMENT_NOT_FOUND",
      name: ViteAppEnvironmentNotFoundError.name,
      message: expect.stringContaining("render"),
    })
  })

  test("normalizes Vite failures while creating the application builder", async () => {
    const session = createViteBuildSession({ buildId: "build:config" })
    const adapter = new ViteAppBuilderAdapter(
      /** @type {any} */ (async () => {
        throw new Error("config plugin failed")
      }),
    )

    await expect(adapter.build(attachViteBuildSession({}, session)))
      .rejects.toMatchObject({
        code: "MINISTA_VITE_BUILD_FAILED",
        environment: "application",
      })
    expect(session.diagnostics.snapshot()).toMatchObject([{
      code: "MINISTA_VITE_BUILD_FAILED",
    }])
  })

  test("normalizes client preparation failures", async () => {
    const render = { name: "render", config: { root: "/project" } }
    const client = {
      name: "client",
      config: {
        root: "/project",
        base: "/",
        build: { write: false },
      },
      plugins: [{
        name: "fixture",
        api: {
          minista: {
            feature: { id: "fixture", apiVersion: 1 },
            async prepareClient() {
              throw new Error("prepare failed")
            },
          },
        },
      }],
    }
    const session = createViteBuildSession({ buildId: "build:prepare" })
    const adapter = new ViteAppBuilderAdapter(
      /** @type {any} */ (async () => ({
        environments: { render, client },
        async build() {
          return { output: [] }
        },
      })),
    )

    await expect(adapter.build(attachViteBuildSession({
      configFile: false,
    }, session))).rejects.toMatchObject({
      code: "MINISTA_VITE_BUILD_FAILED",
      environment: "client",
      diagnostic: { phase: "generate" },
    })
    expect(session.diagnostics.snapshot()).toMatchObject([{
      code: "MINISTA_VITE_BUILD_FAILED",
      phase: "generate",
    }])
  })

  test("restores the previous client output when the client build fails", async () => {
    const root = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-app-rollback-"),
    )
    const outDir = path.resolve(root, "dist")
    try {
      await fs.promises.mkdir(outDir)
      await fs.promises.writeFile(
        path.resolve(outDir, "stable.html"),
        "stable",
      )
      const render = { name: "render" }
      const client = {
        name: "client",
        config: {
          root,
          base: "/",
          build: { write: true, outDir: "dist" },
        },
      }
      const builder = {
        environments: { render, client },
        /** @param {{name: string}} environment */
        async build(environment) {
          if (environment.name === "client") {
            await fs.promises.mkdir(outDir)
            await fs.promises.writeFile(
              path.resolve(outDir, "partial.html"),
              "partial",
            )
            throw new Error("client failed")
          }
          return { output: [] }
        },
      }
      const adapter = new ViteAppBuilderAdapter(
        /** @type {any} */ (async () => builder),
      )
      const session = createViteBuildSession({ buildId: "build:test" })

      await expect(
        adapter.build(
          attachViteBuildSession(
            { configFile: false },
            session,
          ),
        ),
      ).rejects.toMatchObject({
        code: "MINISTA_VITE_BUILD_FAILED",
        environment: "client",
        diagnostic: {
          code: "MINISTA_VITE_BUILD_FAILED",
          phase: "bundle",
        },
      })
      expect(session.diagnostics.snapshot()).toMatchObject([{
        code: "MINISTA_VITE_BUILD_FAILED",
      }])
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
})
