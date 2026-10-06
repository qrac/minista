import { describe, expect, test, vi } from "vitest"

import {
  ViteDevEnvironmentNotRunnableError,
  ViteDevModuleError,
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

  test("normalizes module evaluation failures with a safe location", async () => {
    const cause = Object.assign(new Error("Unexpected token"), {
      id: "/project/src/pages/index.jsx?import",
      loc: { line: 8, column: 3 },
    })
    const ssrFixStacktrace = vi.fn()
    const environment = {
      runner: {
        async import() {
          throw cause
        },
      },
      moduleGraph: {},
    }
    const evaluator = new ViteDevModuleEvaluator(
      /** @type {any} */ ({
        config: { root: "/project" },
        environments: { render: environment },
        ssrFixStacktrace,
      }),
      "render",
      /** @type {any} */ (() => true),
    )

    await expect(evaluator.importModule("/src/pages/index.jsx"))
      .rejects.toMatchObject({
        code: "MINISTA_VITE_DEV_MODULE_FAILED",
        name: ViteDevModuleError.name,
        environment: "render",
        moduleId: "/src/pages/index.jsx",
        cause,
        diagnostic: {
          severity: "error",
          phase: "resolve",
          location: {
            file: "src/pages/index.jsx",
            line: 8,
            column: 3,
          },
        },
      })
    expect(ssrFixStacktrace).toHaveBeenCalledWith(cause)
  })

  test("preserves errors from an existing Minista boundary", async () => {
    const error = Object.assign(new Error("known failure"), {
      code: "MINISTA_KNOWN_FAILURE",
    })
    const ssrFixStacktrace = vi.fn()
    const evaluator = new ViteDevModuleEvaluator(
      /** @type {any} */ ({
        environments: {
          render: {
            runner: { async import() { throw error } },
            moduleGraph: {},
          },
        },
        ssrFixStacktrace,
      }),
      "render",
      /** @type {any} */ (() => true),
    )

    await expect(evaluator.importModule("virtual:test")).rejects.toBe(error)
    expect(ssrFixStacktrace).not.toHaveBeenCalled()
  })
})
