import { describe, expect, test, vi } from "vitest"

import { loadViteAppConfig } from "../../../src/adapters/vite/app-config-loader.js"

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

  test("skips loading when no config file or root can be resolved", async () => {
    const loader = vi.fn()
    await loadViteAppConfig({}, {}, /** @type {any} */ (loader))
    expect(loader).not.toHaveBeenCalled()
  })
})
