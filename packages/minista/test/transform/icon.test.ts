import { describe, expect, it } from "vitest"

import { resolveIconAttrs } from "../../src/transform/icon"

describe("resolveIconAttrs", () => {
  it("Default", () => {
    const result = resolveIconAttrs({
      fileName: "/assets/icons.svg",
      iconId: "test",
    })

    //console.log(result)
    expect(result.href).toEqual("/assets/icons.svg#test")
  })

  it("Add href", () => {
    const result = resolveIconAttrs({
      fileName: "/assets/icons.svg",
      iconId: "test",
      addHref: "/base/",
    })

    //console.log(result)
    expect(result.href).toEqual("/base/assets/icons.svg#test")
  })

  it("Remove href", () => {
    const result = resolveIconAttrs({
      fileName: "/assets/icons.svg",
      iconId: "test",
      removeHref: "/assets",
    })

    //console.log(result)
    expect(result.href).toEqual("/icons.svg#test")
  })
})
