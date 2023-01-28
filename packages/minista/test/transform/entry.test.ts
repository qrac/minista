import { describe, expect, it } from "vitest"
import { parse as parseHtml } from "node-html-parser"

import { getEntrySrc } from "../../src/transform/entry"

describe("getEntrySrc", () => {
  it("Link", () => {
    const html = `<link rel="stylesheet" href="/test.css">`
    const parsedHtml = parseHtml(html)
    const element = parsedHtml.querySelector("link")
    if (element) {
      const result = getEntrySrc(element)
      expect(result).toEqual("/test.css")
    }
  })

  it("Script", () => {
    const html = `<script type="module" src="/test.ts"></script>`
    const parsedHtml = parseHtml(html)
    const element = parsedHtml.querySelector("script")
    if (element) {
      const result = getEntrySrc(element)
      expect(result).toEqual("/test.ts")
    }
  })
})
