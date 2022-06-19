import { describe, expect, it } from "vitest"

import {
  slashEnd,
  noSlashEnd,
  noSlashStart,
  getFilename,
  getFilenameObject,
  reactStylesToString,
} from "../src/utils"

describe("slashEnd", () => {
  it("Test: slashEnd none", () => {
    const result = slashEnd("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Test: slashEnd /", () => {
    const result = slashEnd("/")

    //console.log(result)
    expect(result).toEqual("/")
  })

  it("Test: slashEnd dir/", () => {
    const result = slashEnd("dir/")

    //console.log(result)
    expect(result).toEqual("dir/")
  })

  it("Test: slashEnd dir", () => {
    const result = slashEnd("dir")

    //console.log(result)
    expect(result).toEqual("dir/")
  })
})

describe("noSlashEnd", () => {
  it("Test: noSlashEnd none", () => {
    const result = noSlashEnd("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Test: noSlashEnd /", () => {
    const result = noSlashEnd("/")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Test: noSlashEnd dir/", () => {
    const result = noSlashEnd("dir/")

    //console.log(result)
    expect(result).toEqual("dir")
  })

  it("Test: noSlashEnd dir", () => {
    const result = noSlashEnd("dir")

    //console.log(result)
    expect(result).toEqual("dir")
  })
})

describe("noSlashStart", () => {
  it("Test: noSlashStart none", () => {
    const result = noSlashStart("")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Test: noSlashStart /", () => {
    const result = noSlashStart("/")

    //console.log(result)
    expect(result).toEqual("")
  })

  it("Test: noSlashStart /test/test.ts", () => {
    const result = noSlashStart("/test/test.ts")

    //console.log(result)
    expect(result).toEqual("test/test.ts")
  })

  it("Test: noSlashStart ./test/test.ts", () => {
    const result = noSlashStart("./test/test.ts")

    //console.log(result)
    expect(result).toEqual("test/test.ts")
  })
})

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

describe("reactStylesToString", () => {
  it("Test: reactStylesToString one", () => {
    const result = reactStylesToString({ display: "contents" })

    //console.log(result)
    expect(result).toEqual("display:contents;")
  })

  it("Test: reactStylesToString twe", () => {
    const result = reactStylesToString({
      display: "contents",
      marginTop: "12px",
    })

    //console.log(result)
    expect(result).toEqual("display:contents;margin-top:12px;")
  })
})
