import { describe, expect, it } from "vitest"

import { getRemoteFileName, getRemoteFileExtName } from "../../src/utility/name"

describe("getRemoteFileName", () => {
  it("Default", () => {
    const result = getRemoteFileName("http://example/image.png")

    //console.log(result)
    expect(result).toEqual("image.png")
  })

  it("With param", () => {
    const result = getRemoteFileName("http://example/image.png?test=true")

    //console.log(result)
    expect(result).toEqual("image.png")
  })

  it("Ext none", () => {
    const result = getRemoteFileName("http://example/image")

    //console.log(result)
    expect(result).toEqual("")
  })
})

describe("getRemoteFileExtName", () => {
  it("Default", () => {
    const result = getRemoteFileExtName("http://example/image.png")

    //console.log(result)
    expect(result).toEqual("png")
  })

  it("With param", () => {
    const result = getRemoteFileExtName("http://example/image.png?test=true")

    //console.log(result)
    expect(result).toEqual("png")
  })

  it("Ext none", () => {
    const result = getRemoteFileExtName("http://example/image")

    //console.log(result)
    expect(result).toEqual("")
  })
})
