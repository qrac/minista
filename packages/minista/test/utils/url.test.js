import { describe, it, expect } from "vitest"

import {
  getPageUrl,
  resolveParamUrl,
  extractUrls,
  getBasedAssetUrl,
} from "../../src/utils/url.js"

describe("getPageUrl", () => {
  it("should transform src path to clean route", () => {
    const result = getPageUrl("/src/pages/blog/[slug].tsx", ["/src/pages"])
    expect(result).toBe("/blog/:slug")
  })

  it("should replace index file with root path", () => {
    const result = getPageUrl("/src/pages/index.tsx", ["/src/pages"])
    expect(result).toBe("/")
  })

  it("should replace index file with root path 2", () => {
    const result = getPageUrl("./src/pages/index.tsx", ["./src/pages"])
    expect(result).toBe("/")
  })

  it("should replace index file with root path 3", () => {
    const result = getPageUrl("../src/pages/index.tsx", ["../src/pages"])
    expect(result).toBe("/")
  })

  it("should support rest parameter", () => {
    const result = getPageUrl("/src/pages/docs/[...all].tsx", ["/src/pages"])
    expect(result).toBe("/docs/*")
  })
})

describe("resolveParamUrl", () => {
  it("replaces a single parameter", () => {
    const result = resolveParamUrl("/blog/:slug", { slug: "hello-world" })
    expect(result).toBe("/blog/hello-world")
  })

  it("replaces multiple parameters", () => {
    const result = resolveParamUrl("/users/:userId/posts/:postId", {
      userId: "42",
      postId: "100",
    })
    expect(result).toBe("/users/42/posts/100")
  })

  it("replaces the same parameter multiple times", () => {
    const result = resolveParamUrl("/:lang/about/:lang/contact", {
      lang: "en",
    })
    expect(result).toBe("/en/about/en/contact")
  })

  it("works with numeric values", () => {
    const result = resolveParamUrl("/product/:id", { id: 123 })
    expect(result).toBe("/product/123")
  })

  it("returns the same path if no placeholders are present", () => {
    const result = resolveParamUrl("/about", { unused: "value" })
    expect(result).toBe("/about")
  })

  it("does not throw if a parameter is missing in paths", () => {
    const result = resolveParamUrl("/blog/:slug", {})
    expect(result).toBe("/blog/:slug")
  })

  it("partially replaces parameters if only some are provided", () => {
    const result = resolveParamUrl("/blog/:year/:slug", { year: "2024" })
    expect(result).toBe("/blog/2024/:slug")
  })
})

describe("extractUrls", () => {
  const html = `
    <img src="/images/a.jpg?ver=1#foo" />
    <img src="/images/b.jpg" />
    <img src="/images/b.jpg" />
    <source srcset="/img/c.jpg 1x, /img/d.jpg 2x" />
  `

  it("extracts src from img", () => {
    const result = extractUrls(html, "img", "src")
    expect(result).toEqual(["/images/a.jpg", "/images/b.jpg"])
  })

  it("extracts srcset from source", () => {
    const result = extractUrls(html, "source", "srcset", "/img/")
    expect(result).toEqual(["/img/c.jpg", "/img/d.jpg"])
  })

  it("ignores non-matching start", () => {
    const result = extractUrls(html, "source", "srcset", "/no-match/")
    expect(result).toEqual([])
  })
})

describe("getBasedAssetUrl", () => {
  it("returns relative path when base is './'", () => {
    const result = getBasedAssetUrl("./", "blog/index.html", "assets/logo.png")
    expect(result).toBe("../assets/logo.png")
  })

  it("returns absolute URL when base is '/'", () => {
    const result = getBasedAssetUrl("/", "blog/index.html", "assets/logo.png")
    expect(result).toBe("/assets/logo.png")
  })

  it("returns URL with custom base", () => {
    const result = getBasedAssetUrl(
      "/subdir/",
      "blog/index.html",
      "assets/logo.png"
    )
    expect(result).toBe("/subdir/assets/logo.png")
  })
})
