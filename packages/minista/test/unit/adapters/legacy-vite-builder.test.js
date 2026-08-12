import { describe, expect, test, vi } from "vitest"

import {
  LegacyViteBuilderAdapter,
  ViteEnvironmentNotFoundError,
} from "../../../src/adapters/vite/legacy-builder.js"

describe("legacy Vite Builder adapter", () => {
  test("builds the single legacy environment through createBuilder", async () => {
    const environment = { name: "ssr" }
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
})
