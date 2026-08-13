import { describe, expect, test, vi } from "vitest"

import { DevRenderCache } from "../../../src/features/ssg/dev-render-cache.js"

describe("DevRenderCache", () => {
  test("invalidates only the selected page nodes", async () => {
    const cache = new DevRenderCache()
    const renderA = vi.fn(async () => "a1")
    const renderB = vi.fn(async () => "b1")
    await cache.get("page:a", renderA)
    await cache.get("page:b", renderB)

    cache.invalidate(["page:a"])

    expect(await cache.get("page:a", async () => "a2")).toBe("a2")
    expect(await cache.get("page:b", async () => "b2")).toBe("b1")
  })

  test("removes page nodes no longer present in the graph", async () => {
    const cache = new DevRenderCache()
    await cache.get("page:removed", async () => "old")
    cache.retain(["page:current"])

    expect(await cache.get("page:removed", async () => "new")).toBe("new")
  })
})
