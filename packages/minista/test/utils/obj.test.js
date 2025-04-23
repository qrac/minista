import { describe, it, expect } from "vitest"

import { mergeObj } from "../../src/utils/obj.js"

describe("mergeObj", () => {
  it("should merge simple objects", () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it("should not merge arrays", () => {
    const obj1 = { items: [1, 2] }
    const obj2 = { items: [3, 4] }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ items: [3, 4] })
  })

  it("should deeply merge nested objects", () => {
    const obj1 = { a: { x: 1 } }
    const obj2 = { a: { y: 2 } }
    const result = mergeObj(obj1, obj2)
    expect(result).toEqual({ a: { x: 1, y: 2 } })
  })

  it("should handle multiple objects", () => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    const obj3 = { c: 3 }
    const result = mergeObj(obj1, obj2, obj3)
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })
})
