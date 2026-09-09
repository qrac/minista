import { afterEach, expect, test, vi } from "vitest"
import { runIslands } from "../../../src/plugins/island/runtime.js"

/** @param {string} directive */
const element = (directive, id = 1, params = "{}") => ({
  getAttribute: /** @param {string} name */ (name) => name.endsWith("snippet") ? String(id) : name.endsWith("params") ? params : directive,
  innerHTML: "<button>0</button>", firstElementChild: {}, isConnected: true,
})
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)) }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

test("visible imports on intersection, shares pending modules and hydrates each instance once", async () => {
  const elements = [element("visible"), element("visible")]
  /** @type {Array<(entries: { isIntersecting: boolean }[]) => void>} */
  const callbacks = []
  const disconnect = vi.fn()
  vi.stubGlobal("document", { querySelectorAll: () => elements })
  vi.stubGlobal("IntersectionObserver", class {
    /** @param {(entries: { isIntersecting: boolean }[]) => void} callback */
    constructor(callback) { callbacks.push(callback) }
    observe() {}
    disconnect = disconnect
  })
  const load = vi.fn(async () => ({ default: "component" }))
  const renderIsland = vi.fn()
  const renderer = vi.fn(async () => ({ renderIsland }))
  runIslands({ 1: load }, "island", renderer)
  runIslands({ 1: load }, "island", renderer)
  expect(callbacks).toHaveLength(2)
  callbacks[0]([{ isIntersecting: false }])
  expect(load).not.toHaveBeenCalled()
  expect(renderer).not.toHaveBeenCalled()
  callbacks.forEach((callback) => { callback([{ isIntersecting: true }, { isIntersecting: true }]); callback([{ isIntersecting: true }]) })
  await flush()
  expect(load).toHaveBeenCalledTimes(1)
  expect(renderer).toHaveBeenCalledTimes(1)
  expect(renderIsland).toHaveBeenCalledTimes(2)
  expect(renderIsland.mock.calls.map((call) => call[0])).toEqual(elements)
})

test("media waits for a match, removes its listener and ignores subsequent matches", async () => {
  let change = () => {}
  const media = { matches: false, addEventListener: vi.fn((_name, fn) => { change = fn }), removeEventListener: vi.fn() }
  vi.stubGlobal("window", { matchMedia: vi.fn(() => media) })
  vi.stubGlobal("document", { querySelectorAll: () => [element("media", 1, "(max-width: 600px)")] })
  const load = vi.fn(async () => ({ default: "component" }))
  const renderIsland = vi.fn()
  runIslands({ 1: load }, "", async () => ({ renderIsland }))
  expect(load).not.toHaveBeenCalled()
  media.matches = true
  change(); change()
  await flush()
  expect(load).toHaveBeenCalledTimes(1)
  expect(renderIsland).toHaveBeenCalledTimes(1)
  expect(media.removeEventListener).toHaveBeenCalledWith("change", change)
})

test("idle waits for the callback while load and only start immediately", async () => {
  let idle = () => {}
  vi.stubGlobal("window", { requestIdleCallback: vi.fn((fn) => { idle = fn }) })
  vi.stubGlobal("document", { querySelectorAll: () => [element("idle", 1, '{"timeout":50}'), element("load", 2), element("only", 3)] })
  const loaders = Object.fromEntries([1, 2, 3].map((id) => [id, vi.fn(async () => ({ default: id }))]))
  const renderIsland = vi.fn()
  runIslands(loaders, "island", async () => ({ renderIsland }))
  expect(loaders[1]).not.toHaveBeenCalled()
  expect(loaders[2]).toHaveBeenCalledTimes(1)
  expect(loaders[3]).toHaveBeenCalledTimes(1)
  idle(); idle()
  await flush()
  expect(loaders[1]).toHaveBeenCalledTimes(1)
  expect(renderIsland.mock.calls.map((call) => call[2]).sort()).toEqual([false, false, true])
})

test("import failures are structured, preserve SSR and do not block other islands", async () => {
  const bad = element("load", 1)
  vi.stubGlobal("document", { querySelectorAll: () => [bad, element("only", 2)] })
  const error = vi.spyOn(console, "error").mockImplementation(() => {})
  const renderIsland = vi.fn()
  runIslands({ 1: async () => { throw new Error("offline") }, 2: async () => ({ default: 2 }) }, "island", async () => ({ renderIsland }))
  await flush()
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ code: "MINISTA_ISLAND_LOAD_FAILED", snippet: 1 }))
  expect(bad.innerHTML).toBe("<button>0</button>")
  expect(renderIsland).toHaveBeenCalledTimes(1)
})

test("idle fallback runs and detached elements are not hydrated", async () => {
  vi.stubGlobal("window", {})
  vi.stubGlobal("document", { querySelectorAll: () => [{ ...element("idle"), isConnected: false }] })
  const load = vi.fn(async () => ({ default: "component" }))
  const renderIsland = vi.fn()
  runIslands({ 1: load }, "island", async () => ({ renderIsland }))
  await flush()
  expect(load).toHaveBeenCalledTimes(1)
  expect(renderIsland).not.toHaveBeenCalled()
})
