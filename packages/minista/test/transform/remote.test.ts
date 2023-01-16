import { describe, expect, it } from "vitest"

import {
  getRemoteFileName,
  getRemoteFileExt,
  splitRemoteUrls,
} from "../../src/transform/remote"

describe("getRemoteFileName", () => {
  it("Default", () => {
    const result = getRemoteFileName("http://example/image.png")
    expect(result).toEqual("image.png")
  })

  it("With param", () => {
    const result = getRemoteFileName("http://example/image.png?test=true")
    expect(result).toEqual("image.png")
  })

  it("Ext none", () => {
    const result = getRemoteFileName("http://example/image")
    expect(result).toEqual("")
  })
})

describe("getRemoteFileExt", () => {
  it("Default", () => {
    const result = getRemoteFileExt("http://example/image.png")
    expect(result).toEqual("png")
  })

  it("With param", () => {
    const result = getRemoteFileExt("http://example/image.png?test=true")
    expect(result).toEqual("png")
  })

  it("Ext none", () => {
    const result = getRemoteFileExt("http://example/image")
    expect(result).toEqual("")
  })
})

describe("splitRemoteUrls", () => {
  it("Default", () => {
    const urls = [
      "https://ex.com/xx/test1.jpg",
      "https://ex.com/test2",
      "https://ex.com/xx/test3",
      "https://ex.com/test4.png",
    ]
    const result = splitRemoteUrls(urls)
    expect(result).toEqual({
      hasNameUrls: ["https://ex.com/xx/test1.jpg", "https://ex.com/test4.png"],
      noNameUrls: ["https://ex.com/test2", "https://ex.com/xx/test3"],
    })
  })
})
