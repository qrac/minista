import { describe, expect, it } from "vitest"

import { getRelativePath } from "../../src/transform/relative"

describe("getRelativePath", () => {
  it("Root", () => {
    const result = getRelativePath({
      pathname: "/",
      replaceTarget: "/assets/images",
      assetPath: "/assets/images/image.png",
    })
    expect(result).toEqual("assets/images/image.png")
  })

  it("Nest", () => {
    const result = getRelativePath({
      pathname: "/about/",
      replaceTarget: "/assets/images",
      assetPath: "/assets/images/image.png",
    })
    expect(result).toEqual("../assets/images/image.png")
  })

  it("Root multiple", () => {
    const result = getRelativePath({
      pathname: "/",
      replaceTarget: "/assets/images",
      assetPath:
        "/assets/images/image.png 768w, /assets/images/image.png 1024w",
    })
    expect(result).toEqual(
      "assets/images/image.png 768w, assets/images/image.png 1024w"
    )
  })

  it("Nest multiple", () => {
    const result = getRelativePath({
      pathname: "/about/",
      replaceTarget: "/assets/images",
      assetPath:
        "/assets/images/image.png 768w, /assets/images/image.png 1024w",
    })
    expect(result).toEqual(
      "../assets/images/image.png 768w, ../assets/images/image.png 1024w"
    )
  })

  it("Anchor root", () => {
    const result = getRelativePath({
      pathname: "/",
      replaceTarget: "/",
      assetPath: "/about/",
    })
    expect(result).toEqual("about")
  })

  it("Anchor nest", () => {
    const result = getRelativePath({
      pathname: "/about/",
      replaceTarget: "/",
      assetPath: "/",
    })
    expect(result).toEqual("..")
  })
})
