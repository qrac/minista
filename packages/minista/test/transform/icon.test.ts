import { describe, expect, it } from "vitest"

import { getIconHref } from "../../src/transform/icon"

describe("getIconHref", () => {
  it("Default", () => {
    const result = getIconHref("/assets/icons.svg", "test")
    expect(result).toEqual("/assets/icons.svg#test")
  })

  it("Add href", () => {
    const result = getIconHref("/assets/icons.svg", "test", { add: "/base/" })
    expect(result).toEqual("/base/assets/icons.svg#test")
  })

  it("Remove href", () => {
    const result = getIconHref("/assets/icons.svg", "test", {
      remove: "/assets",
    })
    expect(result).toEqual("/icons.svg#test")
  })
})
