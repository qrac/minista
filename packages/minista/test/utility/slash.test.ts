import { describe, expect, it } from "vitest"

import { slashEnd, noSlashEnd, noSlashStart } from "../../src/utility/slash"

describe("slashEnd", () => {
  it("No props", () => {
    const result = slashEnd("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Slash only", () => {
    const result = slashEnd("/")

    //console.log(result)
    expect(result).toEqual("/")
  })

  it("Slash end", () => {
    const result = slashEnd("dir/")

    //console.log(result)
    expect(result).toEqual("dir/")
  })

  it("String only", () => {
    const result = slashEnd("dir")

    //console.log(result)
    expect(result).toEqual("dir/")
  })
})

describe("noSlashEnd", () => {
  it("No props", () => {
    const result = noSlashEnd("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Slash only", () => {
    const result = noSlashEnd("/")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Slash end", () => {
    const result = noSlashEnd("dir/")

    //console.log(result)
    expect(result).toEqual("dir")
  })

  it("String only", () => {
    const result = noSlashEnd("dir")

    //console.log(result)
    expect(result).toEqual("dir")
  })
})

describe("noSlashStart", () => {
  it("No props", () => {
    const result = noSlashStart("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Slash only", () => {
    const result = noSlashStart("/")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Slash start", () => {
    const result = noSlashStart("/test/test.ts")

    //console.log(result)
    expect(result).toEqual("test/test.ts")
  })

  it("Relative start", () => {
    const result = noSlashStart("./test/test.ts")

    //console.log(result)
    expect(result).toEqual("test/test.ts")
  })
})
