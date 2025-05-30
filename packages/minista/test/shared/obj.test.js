import { describe, it, expect } from "vitest"

import { cleanObj, mergeObj } from "../../src/shared/obj.js"

describe("cleanObj 関数", () => {
  it("トップレベルの undefined プロパティを除去する", () => {
    const input = { a: 1, b: undefined, c: 2 }
    const output = cleanObj(input)
    expect(output).toEqual({ a: 1, c: 2 })
  })

  it("ネストした undefined プロパティも再帰的に除去する", () => {
    const input = {
      a: 1,
      b: undefined,
      nest: {
        x: undefined,
        y: 10,
        z: { foo: undefined, bar: 42 },
      },
    }
    const output = cleanObj(input)
    expect(output).toEqual({
      a: 1,
      nest: { y: 10, z: { bar: 42 } },
    })
  })

  it("配列や配列の要素はそのまま残す", () => {
    const input = {
      arr: [1, undefined, 2],
      foo: undefined,
      nest: { arr: [undefined, 5], bar: undefined },
    }
    const output = cleanObj(input)
    expect(output).toEqual({
      arr: [1, undefined, 2],
      nest: { arr: [undefined, 5] },
    })
  })

  it("オブジェクト以外の値はそのまま返す", () => {
    expect(cleanObj(undefined)).toBe(undefined)
    expect(cleanObj(123)).toBe(123)
    expect(cleanObj("hello")).toBe("hello")
    expect(cleanObj(null)).toBe(null)
  })

  it("全てのプロパティが undefined の場合は空オブジェクトを返す", () => {
    const input = { a: undefined, b: undefined }
    const output = cleanObj(input)
    expect(output).toEqual({})
  })
})

describe("mergeObj", () => {
  it("シンプルなオブジェクトをマージする", () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it("配列はマージしない", () => {
    const obj1 = { items: [1, 2] }
    const obj2 = { items: [3, 4] }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ items: [3, 4] })
  })

  it("ネストされたオブジェクトを深くマージする", () => {
    const obj1 = { a: { x: 1 } }
    const obj2 = { a: { y: 2 } }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ a: { x: 1, y: 2 } })
  })
})
