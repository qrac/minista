import { describe, expect, test, vi } from "vitest"

import {
  loadViteAppConfig,
  ViteAppConfigPluginMismatchError,
} from "../../../src/adapters/vite/app-config-loader.js"

describe("Vite App Build config loader", () => {
  test("projects legacy render config options into render only", async () => {
    const loader = vi.fn(async () => ({
      path: "/project/vite.config.js",
      dependencies: [],
      config: {
        resolve: { alias: { react: "react" }, conditions: ["module"] },
        build: { sourcemap: true },
        plugins: [{ name: "render-only" }],
      },
    }))

    const config = await loadViteAppConfig(
      {
        root: "/project",
        resolve: { alias: { react: "preact/compat" } },
        environments: {
          render: { build: { outDir: "dist/render" } },
        },
      },
      {},
      /** @type {any} */ (loader),
    )

    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({ command: "build", isSsrBuild: true }),
      undefined,
      "/project",
      undefined,
      undefined,
      undefined,
    )
    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({ command: "build", isSsrBuild: false }),
      undefined,
      "/project",
      undefined,
      undefined,
      undefined,
    )
    expect(config.environments?.render).toMatchObject({
      consumer: "server",
      resolve: { conditions: ["module"] },
      build: { outDir: "dist/render", sourcemap: true, ssr: true },
    })
    expect(config.environments?.client).toMatchObject({
      consumer: "client",
      build: { ssr: false },
    })
    expect(config.plugins).toBeUndefined()
  })

  test("rejects legacy config functions that change plugin composition", async () => {
    const loader = vi.fn(async (environment) => ({
      path: "/project/vite.config.js",
      dependencies: [],
      config: {
        plugins: environment.isSsrBuild
          ? [{ name: "render-only" }]
          : [{ name: "client-only" }],
      },
    }))

    await expect(
      loadViteAppConfig(
        { root: "/project" },
        {},
        /** @type {any} */ (loader),
      ),
    ).rejects.toMatchObject({
      code: "MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH",
      name: ViteAppConfigPluginMismatchError.name,
      renderPlugins: ["render-only"],
      clientPlugins: ["client-only"],
      diagnostic: {
        severity: "warning",
        phase: "analyze",
      },
    })
  })

  test("skips loading when no config file or root can be resolved", async () => {
    const loader = vi.fn()
    await loadViteAppConfig({}, {}, /** @type {any} */ (loader))
    expect(loader).not.toHaveBeenCalled()
  })
})
