import { describe, expect, test } from "vitest"

import { DevImagePageIndex } from "../../../src/features/image/dev-page-index.js"

describe("DevImagePageIndex", () => {
  test("returns pages connected to a normalized local image source", () => {
    const index = new DevImagePageIndex()
    index.replacePage("/?preview=1", ["/src/images/hero.png"])
    index.replacePage("docs", ["src/images/hero.png"])

    expect(index.getPages("./src/images/hero.png")).toEqual(["/", "/docs"])
  })

  test("removes stale source edges on page transformation", () => {
    const index = new DevImagePageIndex()
    index.replacePage("/", ["src/images/old.png"])
    index.replacePage("/", ["src/images/new.png"])

    expect(index.getPages("src/images/old.png")).toEqual([])
    expect(index.getPages("src/images/new.png")).toEqual(["/"])
  })
})
