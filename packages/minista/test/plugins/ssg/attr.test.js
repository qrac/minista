import { describe, it, expect } from "vitest"

import { headAttrsToStr } from "../../../src/plugins/ssg/utils/attr.js"

describe("headAttrsToStr (excluding undefined)", () => {
  it("空のオブジェクトの場合は空文字を返す", () => {
    expect(headAttrsToStr({})).toBe("")
  })

  it("単一の属性を変換する", () => {
    expect(headAttrsToStr({ lang: "ja" })).toBe('lang="ja"')
  })

  it("複数の属性を変換する", () => {
    const result = headAttrsToStr({ lang: "en", dir: "ltr" })
    expect(['lang="en" dir="ltr"', 'dir="ltr" lang="en"']).toContain(result)
  })

  it("数値を処理できる", () => {
    expect(headAttrsToStr({ tabIndex: 0 })).toBe('tabIndex="0"')
  })

  it("boolean の true と false を扱う", () => {
    expect(headAttrsToStr({ hidden: true, inert: false })).toBe(
      'hidden="true" inert="false"'
    )
  })

  it("null を扱う", () => {
    expect(headAttrsToStr({ test: null })).toBe('test="null"')
  })

  it("undefined の属性を除外する", () => {
    const result = headAttrsToStr({ lang: undefined, theme: "dark" })
    expect(result).toBe('theme="dark"')
  })

  it("混合された値を扱う", () => {
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
