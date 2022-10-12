import { describe, expect, it } from "vitest"

import { compileBundleTag } from "../../src/compile/tags"

describe("compileComment", () => {
  it("Default", () => {
    const result = compileBundleTag({
      fileName: "index.html",
      bundleCssName: "assets/bundle.css",
      base: "/",
    })

    //console.log(result)
    expect(result).toEqual(`<link rel="stylesheet" href="/assets/bundle.css">`)
  })

  it("Relative", () => {
    const result = compileBundleTag({
      fileName: "index.html",
      bundleCssName: "assets/bundle.css",
      base: "./",
    })

    //console.log(result)
    expect(result).toEqual(`<link rel="stylesheet" href="assets/bundle.css">`)
  })

  it("Relative nest", () => {
    const result = compileBundleTag({
      fileName: "foo/bar/index.html",
      bundleCssName: "assets/bundle.css",
      base: "./",
    })

    //console.log(result)
    expect(result).toEqual(
      `<link rel="stylesheet" href="../../assets/bundle.css">`
    )
  })
})
