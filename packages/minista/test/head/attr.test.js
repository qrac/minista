import { describe, it, expect } from "vitest"

import { headAttrsToStr } from "../../src/head/attr.js"

describe("headAttrsToStr (excluding undefined)", () => {
  it("returns empty string for empty object", () => {
    expect(headAttrsToStr({})).toBe("")
  })

  it("converts a single attribute", () => {
    expect(headAttrsToStr({ lang: "ja" })).toBe('lang="ja"')
  })

  it("converts multiple attributes", () => {
    const result = headAttrsToStr({ lang: "en", dir: "ltr" })
    expect(['lang="en" dir="ltr"', 'dir="ltr" lang="en"']).toContain(result)
  })

  it("handles numeric values", () => {
    expect(headAttrsToStr({ tabIndex: 0 })).toBe('tabIndex="0"')
  })

  it("handles boolean true and false", () => {
    expect(headAttrsToStr({ hidden: true, inert: false })).toBe(
      'hidden="true" inert="false"'
    )
  })

  it("handles null", () => {
    // @ts-ignore
    expect(headAttrsToStr({ test: null })).toBe('test="null"')
  })

  it("omits undefined attributes", () => {
    // @ts-ignore
    const result = headAttrsToStr({ lang: undefined, theme: "dark" })
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
    const result = headAttrsToStr(attrs)
    expect(result).toBe('lang="en" count="5" hidden="false" title="null"')
  })
})
