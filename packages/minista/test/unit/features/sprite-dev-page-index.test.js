import { describe, expect, test } from "vitest"

import { DevSpritePageIndex } from "../../../src/features/sprite/dev-page-index.js"

describe("DevSpritePageIndex", () => {
  test("returns only pages connected to a changed sprite source", () => {
    const index = new DevSpritePageIndex()
    index.replacePage("/?preview=1", ["src/icons", "src/shared"])
    index.replacePage("docs", ["src/shared"])

    expect(index.getPages("./src/icons/")).toEqual(["/"])
    expect(index.getPages("src/shared")).toEqual(["/", "/docs"])
  })

  test("replaces stale artifact edges when a page is transformed again", () => {
    const index = new DevSpritePageIndex()
    index.replacePage("/", ["src/old"])
    index.replacePage("/", ["src/new"])

    expect(index.getPages("src/old")).toEqual([])
    expect(index.getPages("src/new")).toEqual(["/"])
  })
})
