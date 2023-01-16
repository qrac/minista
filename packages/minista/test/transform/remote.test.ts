import { describe, expect, it } from "vitest"

import { getRemoteExt } from "../../src/transform/remote"

describe("getRemoteExt", () => {
  it("Default", () => {
    const result = getRemoteExt("http://example/image.png")
    expect(result).toEqual("png")
  })

  it("With param", () => {
    const result = getRemoteExt("http://example/image.png?test=true")
    expect(result).toEqual("png")
  })

  it("Ext none", () => {
    const result = getRemoteExt("http://example/image")
    expect(result).toEqual("")
  })
})
