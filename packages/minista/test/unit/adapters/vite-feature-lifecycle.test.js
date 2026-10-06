import { describe, expect, test } from "vitest"
import { planViteFeatureLifecycle, registerViteFeatureLifecycle, runViteDevLifecycle } from "../../../src/adapters/vite/feature-lifecycle.js"

/** @param {string} id @param {string[]} after @param {string[]} calls */
function feature(id, after, calls) {
  return registerViteFeatureLifecycle({
    name: id,
    api: { minista: { feature: { id, apiVersion: 1, requires: ["html-documents"], provides: [], after } } },
    generateBundle() { calls.push(id) },
  })
}
describe("application feature coordinator", () => {
  test("dispatches each pipeline once in dependency order across Vite hooks", async () => {
    /** @type {string[]} */
    const calls = []
    const plugins = [feature("search", ["svg"], calls), feature("svg", [], calls)]
    const context = { environment: { plugins } }
    for (const plugin of plugins) {
      await /** @type {any} */ (plugin.generateBundle).handler.call(context, {}, {}, true)
    }
    expect(calls).toEqual(["svg", "search"])
  })
  test("validates the complete dependency graph before running a pipeline", () => {
    /** @type {string[]} */
    const calls = []
    const plugins = [feature("search", ["svg"], calls), feature("svg", ["search"], calls)]
    expect(() => planViteFeatureLifecycle(plugins)).toThrowError("Invalid Minista")
    expect(calls).toEqual([])
  })
})

test("serializes dev domain mutations and recovers the queue after rejection", async () => {
  const plugin = feature("fixture", [], [])
  const server = /** @type {any} */ ({ config: { plugins: [plugin] } })
  let value = 0
  await Promise.all([1, 2, 3].map(() => runViteDevLifecycle(server, async () => {
    const before = value
    await Promise.resolve()
    value = before + 1
  })))
  expect(value).toBe(3)
  await expect(runViteDevLifecycle(server, async () => { throw Error("failed request") })).rejects.toThrow("failed request")
  await expect(runViteDevLifecycle(server, async () => "next request")).resolves.toBe("next request")
})
