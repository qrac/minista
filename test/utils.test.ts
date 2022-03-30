import { describe, expect, it } from "vitest"

import {
  valueToStringObject,
  sortObject,
  getFilename,
  getFilenameObject,
} from "../src/utils"

describe("getFilename", () => {
  it("Test: getFilename", () => {
    const result = getFilename("entry.js")

    //console.log(result)
    expect(result).toEqual("entry")
  })
})

describe("getFilenameObject", () => {
  it("Test: getFilenameObject", () => {
    const result = getFilenameObject(["entry1.js", "entry2.js"])

    //console.log(result)
    expect(result).toEqual({ entry1: "entry1.js", entry2: "entry2.js" })
  })
})
