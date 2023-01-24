import { describe, expect, it } from "vitest"

import { resolveRelativePath } from "../../src/transform/relative"

describe("resolveRelativePath", () => {
  it("Root", () => {
    const result = resolveRelativePath({
      pathname: "/",
      replaceTarget: "/assets/images",
      assetPath: "/assets/images/image.png",
    })
    expect(result).toEqual("assets/images/image.png")
  })

  it("Nest", () => {
    const result = resolveRelativePath({
      pathname: "/about/",
      replaceTarget: "/assets/images",
      assetPath: "/assets/images/image.png",
    })
    expect(result).toEqual("../assets/images/image.png")
  })

  it("Root multiple", () => {
    const result = resolveRelativePath({
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
    const result = resolveRelativePath({
      pathname: "/about/",
      replaceTarget: "/assets/images",
      assetPath:
        "/assets/images/image.png 768w, /assets/images/image.png 1024w",
    })
    expect(result).toEqual(
      "../assets/images/image.png 768w, ../assets/images/image.png 1024w"
    )
  })
})
