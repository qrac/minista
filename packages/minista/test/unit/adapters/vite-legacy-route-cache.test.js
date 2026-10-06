import { createElement } from "react"
import { describe, expect, test, vi } from "vitest"

import { LegacySsgRouteCache } from "../../../src/adapters/vite/legacy-ssg-route-cache.js"

/** @typedef {import("../../../src/plugins/ssg/types.js").PageComponent} PageComponent */

const Page = /** @type {PageComponent} */ (
  /** @type {unknown} */ (() => createElement("div"))
)

describe("LegacySsgRouteCache", () => {
  test("resolves only invalidated route sources", async () => {
    const homeData = vi.fn(async () => ({ props: { version: 1 } }))
    const postData = vi.fn(async () => ({
      paths: { slug: "one" },
      props: { version: 1 },
    }))
    const importedPages = {
      "/src/pages/index.jsx": { default: Page, getStaticData: homeData },
      "/src/pages/posts/[slug].jsx": {
        default: Page,
        getStaticData: postData,
      },
    }
    const cache = new LegacySsgRouteCache()

    await cache.resolve(importedPages, { srcBases: ["/src/pages"] })
    await cache.resolve(importedPages, { srcBases: ["/src/pages"] })
    cache.invalidate(["src/pages/index.jsx"])
    const result = await cache.resolve(importedPages, {
      srcBases: ["/src/pages"],
    })

    expect(homeData).toHaveBeenCalledTimes(2)
    expect(postData).toHaveBeenCalledTimes(1)
    expect(result.pages.map(({ url }) => url)).toEqual(["/", "/posts/one"])
  })

  test("adds and removes route entries while rebuilding global graph invariants", async () => {
    const cache = new LegacySsgRouteCache()
    const options = { srcBases: ["/src/pages"] }
    await cache.resolve(
      { "/src/pages/index.jsx": { default: Page } },
      options,
    )
    const result = await cache.resolve(
      { "/src/pages/about.jsx": { default: Page } },
      options,
    )

    expect([...result.graph.routes.values()].map(({ pattern }) => pattern))
      .toEqual(["/about"])
  })
})
