import { describe, expect, it } from "vitest"

import { getPagePath } from "../../src/node/index.js"

describe("getPagePath", () => {
  it("root", () => {
    const result = getPagePath("/index.tsx")
    expect(result).toEqual("/")
  })

  it("root, has srcBase", () => {
    const result = getPagePath("/src/pages/index.tsx", "/src/pages")
    expect(result).toEqual("/")
  })

  it("page, named file", () => {
    const result = getPagePath("/about.tsx")
    expect(result).toEqual("/about")
  })

  it("page, index file", () => {
    const result = getPagePath("/about/index.tsx")
    expect(result).toEqual("/about/")
  })

  it("template", () => {
    const result = getPagePath("/posts/[slug].tsx")
    expect(result).toEqual("/posts/:slug")
  })

  it("duplicate root", () => {
    const result = getPagePath("///index.tsx")
    expect(result).toEqual("/")
  })
})
