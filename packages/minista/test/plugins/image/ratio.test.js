import { describe, it, expect } from "vitest"

import { getRatio } from "../../../src/plugins/image/utils/ratio.js"

describe("getRatio", () => {
  it("有効な数値の場合に正しい比率を返す", () => {
    expect(getRatio(50, 200)).toBe(0.25)
    expect(getRatio(3, 2)).toBe(1.5)
  })

  it("小数点以下を小数第4位で丸める", () => {
    expect(getRatio(1, 3)).toBe(0.3333)
  })

  it("other が 0 の場合は 0 を返す", () => {
    expect(getRatio(10, 0)).toBe(0)
    expect(getRatio(0, 0)).toBe(0)
  })

  it("base が 0 の場合は 0 を返す", () => {
    expect(getRatio(0, 5)).toBe(0)
  })

  it("非数値の引数が渡された場合は 0 を返す", () => {
    expect(getRatio("a", 10)).toBe(0)
    expect(getRatio(10, "b")).toBe(0)
  })

  it("負の数値にも対応する", () => {
    expect(getRatio(-50, 200)).toBe(-0.25)
    expect(getRatio(50, -200)).toBe(-0.25)
  })
})
