import { describe, it, expect } from "vitest"

import { getAttrsStr } from "../../src/head/attr.js"

describe("getAttrsStr (excluding undefined)", () => {
  it("returns empty string for empty object", () => {
    expect(getAttrsStr({})).toBe("")
  })

  it("converts a single attribute", () => {
    expect(getAttrsStr({ lang: "ja" })).toBe('lang="ja"')
  })

  it("converts multiple attributes", () => {
    const result = getAttrsStr({ lang: "en", dir: "ltr" })
    expect(['lang="en" dir="ltr"', 'dir="ltr" lang="en"']).toContain(result)
  })

  it("handles numeric values", () => {
    expect(getAttrsStr({ tabIndex: 0 })).toBe('tabIndex="0"')
  })

  it("handles boolean true and false", () => {
    expect(getAttrsStr({ hidden: true, inert: false })).toBe(
      'hidden="true" inert="false"'
    )
  })

  it("handles null", () => {
    expect(getAttrsStr({ test: null })).toBe('test="null"')
  })

  it("omits undefined attributes", () => {
    const result = getAttrsStr({ lang: undefined, theme: "dark" })
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
    const result = getAttrsStr(attrs)
    expect(result).toBe('lang="en" count="5" hidden="false" title="null"')
  })
})
