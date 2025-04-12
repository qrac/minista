import { describe, it, expect } from "vitest"

import {
  getPagePath,
  getHtmlPath,
  resolveParamPath,
} from "../../src/utils/index.js"

describe("getPagePath", () => {
  it("should transform src path to clean route", () => {
    const result = getPagePath("/src/pages/blog/[slug].tsx", ["/src/pages"])
    expect(result).toBe("/blog/:slug")
  })

  it("should replace index file with root path", () => {
    const result = getPagePath("/src/pages/index.tsx", ["/src/pages"])
    expect(result).toBe("/")
  })

  it("should support rest parameter", () => {
    const result = getPagePath("/src/pages/docs/[...all].tsx", ["/src/pages"])
    expect(result).toBe("/docs/*")
  })
})

describe("getHtmlPath", () => {
  it("converts simple paths", () => {
    expect(getHtmlPath("/about")).toBe("about.html")
    expect(getHtmlPath("/blog")).toBe("blog.html")
  })

  it("converts directory paths with trailing slash", () => {
    expect(getHtmlPath("/blog/")).toBe("blog/index.html")
    expect(getHtmlPath("/docs/guide/")).toBe("docs/guide/index.html")
  })

  it("handles root path correctly", () => {
    expect(getHtmlPath("/")).toBe("index.html")
  })

  it("removes only leading slash", () => {
    expect(getHtmlPath("/foo/bar")).toBe("foo/bar.html")
  })
})

describe("resolveParamPath", () => {
  it("replaces a single parameter", () => {
    const result = resolveParamPath("/blog/:slug", { slug: "hello-world" })
    expect(result).toBe("/blog/hello-world")
  })

  it("replaces multiple parameters", () => {
    const result = resolveParamPath("/users/:userId/posts/:postId", {
      userId: "42",
      postId: "100",
    })
    expect(result).toBe("/users/42/posts/100")
  })

  it("replaces the same parameter multiple times", () => {
    const result = resolveParamPath("/:lang/about/:lang/contact", {
      lang: "en",
    })
    expect(result).toBe("/en/about/en/contact")
  })

  it("works with numeric values", () => {
    const result = resolveParamPath("/product/:id", { id: 123 })
    expect(result).toBe("/product/123")
  })

  it("returns the same path if no placeholders are present", () => {
    const result = resolveParamPath("/about", { unused: "value" })
    expect(result).toBe("/about")
  })

  it("does not throw if a parameter is missing in paths", () => {
    const result = resolveParamPath("/blog/:slug", {})
    expect(result).toBe("/blog/:slug")
  })

  it("partially replaces parameters if only some are provided", () => {
    const result = resolveParamPath("/blog/:year/:slug", { year: "2024" })
    expect(result).toBe("/blog/2024/:slug")
  })
})
