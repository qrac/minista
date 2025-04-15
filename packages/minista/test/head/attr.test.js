import { describe, it, expect } from "vitest"

import { convertHeadAttrs } from "../../src/head/attr.js"

describe("convertHeadAttrs (excluding undefined)", () => {
  it("returns empty string for empty object", () => {
    expect(convertHeadAttrs({})).toBe("")
  })

  it("converts a single attribute", () => {
    expect(convertHeadAttrs({ lang: "ja" })).toBe('lang="ja"')
  })

  it("converts multiple attributes", () => {
    const result = convertHeadAttrs({ lang: "en", dir: "ltr" })
    expect(['lang="en" dir="ltr"', 'dir="ltr" lang="en"']).toContain(result)
  })

  it("handles numeric values", () => {
    expect(convertHeadAttrs({ tabIndex: 0 })).toBe('tabIndex="0"')
  })

  it("handles boolean true and false", () => {
    expect(convertHeadAttrs({ hidden: true, inert: false })).toBe(
      'hidden="true" inert="false"'
    )
  })

  it("handles null", () => {
    // @ts-ignore
    expect(convertHeadAttrs({ test: null })).toBe('test="null"')
  })

  it("omits undefined attributes", () => {
    // @ts-ignore
    const result = convertHeadAttrs({ lang: undefined, theme: "dark" })
    expect(result).toBe('theme="dark"')
  })

  it("handles mixed values", () => {
    const attrs = {
      lang: "en",
      theme: undefined,
      count: 5,
      hidden: false,
      title: null,
    }
    const result = convertHeadAttrs(attrs)
    expect(result).toBe('lang="en" count="5" hidden="false" title="null"')
  })
})
