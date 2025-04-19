import { describe, it, expect } from "vitest"

import { getOutputHtmlPath, pathToId, idToPath } from "../../src/utils/path.js"

describe("getOutputHtmlPath", () => {
  it("converts simple paths", () => {
    expect(getOutputHtmlPath("/about")).toBe("about.html")
    expect(getOutputHtmlPath("/blog")).toBe("blog.html")
  })

  it("converts directory paths with trailing slash", () => {
    expect(getOutputHtmlPath("/blog/")).toBe("blog/index.html")
    expect(getOutputHtmlPath("/docs/guide/")).toBe("docs/guide/index.html")
  })

  it("handles root path correctly", () => {
    expect(getOutputHtmlPath("/")).toBe("index.html")
  })

  it("removes only leading slash", () => {
    expect(getOutputHtmlPath("/foo/bar")).toBe("foo/bar.html")
  })
})

describe("pathToId and idToPath", () => {
  const testCases = [
    "/index.html",
    "src/pages/about.tsx",
    "C:\\Users\\Keita\\project\\main.js",
    "./assets/images/logo.png",
    "",
    "/foo?bar#hash",
  ]

  it("should convert path to Base64 and back without loss", () => {
    for (const original of testCases) {
      const encoded = pathToId(original)
      const decoded = idToPath(encoded)

      expect(decoded).toBe(original)
    }
  })

  it("should produce valid base64 strings", () => {
    const result = pathToId("hello/world.js")
    expect(() => Buffer.from(result, "base64")).not.toThrow()
  })

  it("should handle empty string", () => {
    const encoded = pathToId("")
    const decoded = idToPath(encoded)
    expect(encoded).toBe("")
    expect(decoded).toBe("")
  })
})
