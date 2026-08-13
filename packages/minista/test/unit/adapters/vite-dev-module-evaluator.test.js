import { describe, expect, test, vi } from "vitest"

import {
  ViteDevEnvironmentNotRunnableError,
  ViteDevModuleEvaluator,
} from "../../../src/adapters/vite/dev-module-evaluator.js"

describe("Vite dev ModuleEvaluator adapter", () => {
  test("imports and invalidates modules through one runnable environment", async () => {
    const module = { id: "virtual:test" }
    const importModule = vi.fn(async (id) => ({ default: id }))
    const getModuleById = vi.fn(() => module)
    const invalidateModule = vi.fn()
    const ssrFixStacktrace = vi.fn()
    const environment = {
      runner: { import: importModule },
      moduleGraph: { getModuleById, invalidateModule },
    }
    const server = {
      environments: { render: environment },
      ssrFixStacktrace,
    }
    const evaluator = new ViteDevModuleEvaluator(
      /** @type {any} */ (server),
      "render",
      /** @type {any} */ (() => true),
    )

    await expect(evaluator.importModule("virtual:test"))
      .resolves.toEqual({ default: "virtual:test" })
    expect(evaluator.invalidateModule("virtual:test")).toBe(true)
    expect(invalidateModule).toHaveBeenCalledWith(module)
    const error = new Error("test")
    expect(evaluator.fixStacktrace(error)).toBe(error)
    expect(ssrFixStacktrace).toHaveBeenCalledWith(error)
  })

  test("reports a structured error for a non-runnable environment", () => {
    expect(() => new ViteDevModuleEvaluator(
      /** @type {any} */ ({ environments: { ssr: {} } }),
      "ssr",
      /** @type {any} */ (() => false),
    )).toThrowError(ViteDevEnvironmentNotRunnableError)
    try {
      new ViteDevModuleEvaluator(
        /** @type {any} */ ({ environments: {} }),
        "render",
      )
    } catch (error) {
      expect(error).toMatchObject({
        code: "MINISTA_VITE_DEV_ENVIRONMENT_NOT_RUNNABLE",
        diagnostic: { severity: "error", phase: "resolve" },
      })
    }
  })
})
