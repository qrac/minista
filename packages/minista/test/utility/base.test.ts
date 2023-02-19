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

  it("Sub directory", () => {
    const result = resolveBase("./test")
    expect(result).toEqual("/test/")
  })

  it("Sub directory 2", () => {
    const result = resolveBase("test")
    expect(result).toEqual("/test/")
  })

  it("Sub directory 3", () => {
    const result = resolveBase("/test/")
    expect(result).toEqual("/test/")
  })
})
