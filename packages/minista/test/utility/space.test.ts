import { describe, expect, it } from "vitest"

import { getSpace } from "../../src/utility/space"

describe("getSpace", () => {
  it("Default", () => {
    const result = getSpace({
      nameLength: 4,
      maxNameLength: 5,
      min: 3,
    })

    //console.log(result)
    expect(result).toEqual("    ")
  })

  it("Not accepting the minus", () => {
    const result = getSpace({
      nameLength: 7,
      maxNameLength: 5,
      min: -3,
    })

    //console.log(result)
    expect(result).toEqual("")
  })
})
