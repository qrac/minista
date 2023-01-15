import { describe, expect, it } from "vitest"

import { getIconAttrs } from "../../src/transform/icon"

describe("getIconAttrs", () => {
  it("Default", () => {
    const result = getIconAttrs("/assets/icons.svg", "test")
    expect(result.href).toEqual("/assets/icons.svg#test")
  })

  it("Add href", () => {
    const result = getIconAttrs("/assets/icons.svg", "test", { add: "/base/" })
    expect(result.href).toEqual("/base/assets/icons.svg#test")
  })

  it("Remove href", () => {
    const result = getIconAttrs("/assets/icons.svg", "test", {
      remove: "/assets",
    })
    expect(result.href).toEqual("/icons.svg#test")
  })
})
