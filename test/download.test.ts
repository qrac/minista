import { describe, expect, it } from "vitest"
import fetch from "node-fetch"

import { getSrcObject, matchSrcUrls } from "../src/download"

describe("getSrcObject", () => {
  it("Test: getSrcObject single", () => {
    const src = "https://example.com/1.png"
    const result = getSrcObject(src)

    //console.log(result)
    expect(result[0].url).toEqual(src)
  })

  it("Test: getSrcObject multiple ratio", () => {
    const src = "https://example.com/1.png"
    const srcset = "https://example.com/1.png 1x, https://example.com/2.png 2x"
    const result = getSrcObject(srcset)

    //console.log(result)
    expect(result[0].url).toEqual(src)
  })

  it("Test: getSrcObject multiple width", () => {
    const src = "https://example.com/1.png"
    const srcset =
      "https://example.com/1.png 1000w, https://example.com/2.png 2000w"
    const result = getSrcObject(srcset)

    //console.log(result)
    expect(result[0].url).toEqual(src)
  })
})

describe("matchSrcUrls", () => {
  it("Test: matchSrcUrls single have", () => {
    const src = "https://example.com/1.png"
    const result = matchSrcUrls(src, ["https://"])

    //console.log(result)
    expect(result).toHaveLength(1)
  })

  it("Test: matchSrcUrls single unll", () => {
    const src = "https://example.com/1.png"
    const result = matchSrcUrls(src, ["http://"])

    //console.log(result)
    expect(result).toBeNull()
  })

  it("Test: matchSrcUrls multiple have", () => {
    const src = "https://example.com/1.png"
    const result = matchSrcUrls(src, ["https://", "http://"])

    //console.log(result)
    expect(result).toHaveLength(1)
  })
})

/*describe("fetch", () => {
  it("Test: fetch content-type", async () => {
    const src = "https://picsum.photos/id/1/200/300"
    const result = await fetch(src)

    //console.log("result.headers")
    //console.log(result.headers)
    //console.log("result.body")
    //console.log(result.body)
    expect(result.headers.get("content-type")).toEqual("image/jpeg")
  })

  it("Test: fetch content-disposition", async () => {
    const src = "https://picsum.photos/id/1/200/300"
    const result = await fetch(src)

    //console.log("result.headers")
    //console.log(result.headers)
    //console.log("result.body")
    //console.log(result.body)
    expect(
      result.headers
        .get("content-disposition")
        .split("filename=")[1]
        .replace(/\"/g, "")
    ).toEqual("1-200x300.jpg")
  })
})*/
