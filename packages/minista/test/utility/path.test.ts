import { describe, expect, it } from "vitest"

import {
  getFileName,
  getFileNameObject,
  getFileExt,
} from "../../src/utility/path"

describe("getFileName", () => {
  it("default", () => {
    const result = getFileName("entry.js")

    //console.log(result)
    expect(result).toEqual("entry")
  })
})

describe("getFileNameObject", () => {
  it("default", () => {
    const result = getFileNameObject(["entry1.js", "entry2.js"])

    //console.log(result)
    expect(result).toEqual({ entry1: "entry1.js", entry2: "entry2.js" })
  })
})

describe("getFileExt", () => {
  it("default", () => {
    const result = getFileExt("entry.js")

    //console.log(result)
    expect(result).toEqual("js")
  })
})
