import { describe, expect, test } from "vitest"

import { ViteDevServerRegistry } from "../../../src/adapters/vite/dev-server-registry.js"

/** @param {string} root */
function server(root) {
  return /** @type {import("vite").ViteDevServer} */ (
    /** @type {unknown} */ ({ config: { root } })
  )
}

describe("Vite dev server registry", () => {
  test("uses the only registered server when HTML context omits it", () => {
    const registry = new ViteDevServerRegistry()
    const current = server("/project")
    registry.add(current)

    expect(registry.resolve({ path: "/", filename: "" })).toBe(current)
  })

  test("prefers the registered server over an unregistered context wrapper", () => {
    const registry = new ViteDevServerRegistry()
    const current = server("/project")
    const wrapper = server("/project")
    registry.add(current)

    expect(registry.resolve({
      path: "/",
      filename: "",
      server: wrapper,
    })).toBe(current)
  })

  test("resolves multiple servers by the HTML filename root", () => {
    const registry = new ViteDevServerRegistry()
    const first = server("/projects/first")
    const second = server("/projects/second")
    registry.add(first)
    registry.add(second)

    expect(registry.resolve({
      path: "/",
      filename: "/projects/second/src/pages/index.jsx",
    })).toBe(second)
  })

  test("resolves the server that owns an environment", () => {
    const registry = new ViteDevServerRegistry()
    const environment = { config: { root: "/projects/first" } }
    const first = /** @type {import("vite").ViteDevServer} */ (
      /** @type {unknown} */ ({
        config: { root: "/projects/first" },
        environments: { ssr: environment },
      })
    )
    registry.add(first)
    registry.add(server("/projects/second"))

    expect(registry.resolveEnvironment(
      /** @type {import("vite").Environment} */ (environment),
    )).toBe(first)
  })
})
