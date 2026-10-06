import { describe, expect, test } from "vitest"

import { ViteEnvironmentState } from "../../../src/adapters/vite/environment-state.js"
import { collectViteOutputClaims } from "../../../src/adapters/vite/output-claims.js"

describe("Vite environment state", () => {
  test("creates and isolates state by environment name", () => {
    const states = new ViteEnvironmentState(() => ({
      values: /** @type {string[]} */ ([]),
    }))
    states.get("render").values.push("render")
    states.get("client").values.push("client")

    expect(states.get("render").values).toEqual(["render"])
    expect(states.get("client").values).toEqual(["client"])
    expect(states.get()).toEqual({ values: [] })
  })

  test("isolates different environment objects with the same name", () => {
    const states = new ViteEnvironmentState(() => ({ count: 0 }))
    const first = { name: "client" }
    const second = { name: "client" }
    states.get(first).count = 1

    expect(states.get(first).count).toBe(1)
    expect(states.get(second).count).toBe(0)
  })

  test("passes the requested environment to output claim providers", async () => {
    /** @type {(import("vite").Environment | undefined)[]} */
    const environments = []
    const environment = /** @type {import("vite").Environment} */ (
      /** @type {unknown} */ ({ name: "client" })
    )
    await collectViteOutputClaims([{
      name: "fixture",
      api: {
        minista: {
          /** @param {import("vite").Environment | undefined} current */
          outputClaims(current) {
            environments.push(current)
            return []
          },
        },
      },
    }], environment)

    expect(environments).toEqual([environment])
  })
})
