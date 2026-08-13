import { describe, expect, test, vi } from "vitest"

import {
  ViteDevEnvironmentMissingError,
  ViteDevUpdateAdapter,
} from "../../../src/adapters/vite/dev-update.js"

describe("Vite dev update adapter", () => {
  test("owns environment graph invalidation and full reload", () => {
    const module = { id: "virtual:test", file: "/test.js" }
    const invalidateModule = vi.fn()
    const send = vi.fn()
    const graph = {
      getModuleById: vi.fn((id) => id === module.id ? module : undefined),
      getModulesByFile: vi.fn((file) =>
        file === module.file ? new Set([module]) : undefined),
      invalidateModule,
    }
    const adapter = new ViteDevUpdateAdapter(
      /** @type {any} */ ({
        environments: { client: { moduleGraph: graph, hot: { send } } },
      }),
    )

    expect(adapter.hasModule("client", module)).toBe(true)
    expect(adapter.invalidateModuleById(
      "client",
      module.id,
      123,
      true,
    )).toBe(true)
    adapter.invalidateModules("client", [/** @type {any} */ (module)], 456, true)
    adapter.fullReload()

    expect(invalidateModule).toHaveBeenNthCalledWith(
      1,
      module,
      expect.any(Set),
      123,
      true,
    )
    expect(invalidateModule).toHaveBeenNthCalledWith(
      2,
      module,
      expect.any(Set),
      456,
      true,
    )
    expect(send).toHaveBeenCalledWith({ type: "full-reload" })
  })

  test("reports a structured error for a missing environment", () => {
    const adapter = new ViteDevUpdateAdapter(
      /** @type {any} */ ({ environments: {} }),
    )

    expect(() => adapter.fullReload("render"))
      .toThrowError(ViteDevEnvironmentMissingError)
    try {
      adapter.fullReload("render")
    } catch (error) {
      expect(error).toMatchObject({
        code: "MINISTA_VITE_DEV_ENVIRONMENT_MISSING",
        diagnostic: { severity: "error", phase: "resolve" },
      })
    }
  })
})
