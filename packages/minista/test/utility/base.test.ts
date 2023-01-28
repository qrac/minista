import { describe, expect, it } from "vitest"

import { resolveBase } from "../../src/utility/base"

describe("resolveBase", () => {
  it("Root", () => {
    const result = resolveBase("/")
    expect(result).toEqual("/")
  })

  it("Relative", () => {
    const result = resolveBase("./")
    expect(result).toEqual("/")
  })

  it("Absolute", () => {
    const result = resolveBase("./test")
    expect(result).toEqual("/test/")
  })

  it("Absolute 2", () => {
    const result = resolveBase("test")
    expect(result).toEqual("/test/")
  })

  it("Absolute 3", () => {
    const result = resolveBase("/test/")
    expect(result).toEqual("/test/")
  })
})
