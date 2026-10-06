import { describe, expect, test } from "vitest"

import {
  createViteAppConfig,
  getViteAppEnvironmentNames,
  isViteAppClientEnvironment,
} from "../../../src/adapters/vite/app-config.js"

describe("Vite App Build config", () => {
  test("adds named render and client environments", () => {
    const config = createViteAppConfig({ root: "/project" })

    expect(config).toMatchObject({
      root: "/project",
      __ministaAppBuild: { renderName: "render", clientName: "client" },
      builder: {},
      environments: {
        render: { consumer: "server", build: { ssr: true } },
        client: { consumer: "client", build: { ssr: false } },
      },
    })
  })

  test("preserves user environment options and additional environments", () => {
    const config = createViteAppConfig({
      builder: { sharedPlugins: false },
      environments: {
        render: { build: { outDir: "dist/render", ssr: false } },
        client: { build: { outDir: "dist/client", ssr: true } },
        worker: { consumer: "client" },
      },
    })

    expect(config).toMatchObject({
      builder: { sharedPlugins: false },
      environments: {
        render: {
          consumer: "server",
          build: { outDir: "dist/render", ssr: true },
        },
        client: {
          consumer: "client",
          build: { outDir: "dist/client", ssr: false },
        },
        worker: { consumer: "client" },
      },
    })
  })

  test("supports custom environment names", () => {
    const config = createViteAppConfig(
      {},
      { renderName: "server", clientName: "browser" },
    )

    expect(Object.keys(config.environments ?? {})).toEqual([
      "server",
      "browser",
    ])
    expect(getViteAppEnvironmentNames(config)).toEqual({
      renderName: "server",
      clientName: "browser",
    })
  })

  test("does not infer App Build from Vite builder options alone", () => {
    expect(getViteAppEnvironmentNames({ builder: {} })).toBeUndefined()
  })

  test("identifies only the configured App Build client environment", () => {
    const config = createViteAppConfig({})
    /** @param {string} name */
    const environment = (name) => ({
      name,
      getTopLevelConfig: () => config,
    })

    expect(isViteAppClientEnvironment(/** @type {any} */ (environment("client"))))
      .toBe(true)
    expect(isViteAppClientEnvironment(/** @type {any} */ (environment("render"))))
      .toBe(false)
  })
})
