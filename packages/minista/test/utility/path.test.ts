import { describe, expect, it } from "vitest"

import { getHtmlPath } from "../../src/utility/path"

describe("getHtmlPath", () => {
  it("Default", () => {
    const result = getHtmlPath("/")

    //console.log(result)
    expect(result).toEqual("index.html")
  })

  it("Nest", () => {
    const result = getHtmlPath("/about")

    //console.log(result)
    expect(result).toEqual("about.html")
  })

  it("Nest 2", () => {
    const result = getHtmlPath("/about/")

    //console.log(result)
    expect(result).toEqual("about/index.html")
  })
})
