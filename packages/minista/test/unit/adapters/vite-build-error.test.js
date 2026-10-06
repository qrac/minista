import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  normalizeViteBuildError,
  ViteBuildError,
} from "../../../src/adapters/vite/build-error.js"

describe("Vite build error adapter", () => {
  test("normalizes Vite locations to project-relative diagnostics", () => {
    const root = path.resolve("/project")
    const cause = Object.assign(new Error("Unexpected token"), {
      id: path.resolve(root, "src/pages/index.jsx") + "?import",
      loc: { line: 4, column: 7 },
    })

    const error = normalizeViteBuildError(cause, {
      environment: "render",
      root,
    })

    expect(error).toBeInstanceOf(ViteBuildError)
    expect(error).toMatchObject({
      code: "MINISTA_VITE_BUILD_FAILED",
      environment: "render",
      cause,
      diagnostic: {
        code: "MINISTA_VITE_BUILD_FAILED",
        severity: "error",
        phase: "bundle",
        location: {
          file: "src/pages/index.jsx",
          line: 4,
          column: 7,
        },
      },
    })
  })

  test("does not expose locations outside the project root", () => {
    const error = normalizeViteBuildError(
      Object.assign(new Error("dependency failed"), {
        id: "/private/dependency/index.js",
      }),
      { environment: "client", root: "/project" },
    )

    expect(Reflect.get(error, "diagnostic")).not.toHaveProperty("location")
  })

  test("records a more specific adapter phase", () => {
    const error = normalizeViteBuildError(new Error("preparation failed"), {
      environment: "client",
      root: "/project",
      phase: "generate",
    })

    expect(Reflect.get(error, "diagnostic")).toMatchObject({
      code: "MINISTA_VITE_BUILD_FAILED",
      phase: "generate",
    })
  })

  test("preserves errors from an existing Minista boundary", () => {
    const error = Object.assign(new Error("known failure"), {
      code: "MINISTA_KNOWN_FAILURE",
    })

    expect(normalizeViteBuildError(error, {
      environment: "client",
      root: "/project",
    })).toBe(error)
  })
})
