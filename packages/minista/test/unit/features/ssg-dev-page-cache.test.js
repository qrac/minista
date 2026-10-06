import { describe, expect, test, vi } from "vitest"

import { DevPageCache } from "../../../src/features/ssg/dev-page-cache.js"

describe("DevPageCache", () => {
  test("reuses a snapshot and joins concurrent loads", async () => {
    const cache = new DevPageCache()
    const load = vi.fn(async () => ({ pages: ["/"] }))

    const [first, second] = await Promise.all([
      cache.get(load),
      cache.get(load),
    ])
    const third = await cache.get(load)

    expect(load).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
    expect(third).toBe(first)
  })

  test("does not retain a stale load after invalidation", async () => {
    const cache = new DevPageCache()
    /** @type {((value: {generation: number}) => void) | undefined} */
    let release
    const stale = cache.get(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )

    cache.invalidate()
    release?.({ generation: 1 })
    await stale

    const current = await cache.get(async () => ({ generation: 2 }))
    expect(current).toEqual({ generation: 2 })
  })
})
