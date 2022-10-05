import { describe, expect, it } from "vitest"

import {
  resolveEntryInclude,
  resolveEntryExclude,
  resolveEntry,
} from "../../src/config/entry"

describe("resolveEntryInclude", () => {
  it("String", () => {
    const result = resolveEntryInclude("/test/test1")

    //console.log(result)
    expect(result).toEqual(["/test/test1"])
  })

  it("Array", () => {
    const result = resolveEntryInclude(["/test/test1", "/test/test2"])

    //console.log(result)
    expect(result).toEqual(["/test/test1", "/test/test2"])
  })

  it("Object", () => {
    const result = resolveEntryInclude({ include: ["/test/test1"] })

    //console.log(result)
    expect(result).toEqual(["/test/test1"])
  })
})

describe("resolveEntryExclude", () => {
  it("String", () => {
    const result = resolveEntryExclude("/test/test1")

    //console.log(result)
    expect(result).toEqual([])
  })

  it("Array", () => {
    const result = resolveEntryExclude(["/test/test1", "!/test/test2"])

    //console.log(result)
    expect(result).toEqual(["/test/test2"])
  })

  it("Object", () => {
    const result = resolveEntryExclude({
      include: ["/test/test1"],
      exclude: ["/test/test2"],
    })

    //console.log(result)
    expect(result).toEqual(["/test/test2"])
  })
})

describe("resolveEntry", () => {
  it("No props", async () => {
    const configEntry = ""
    const result = await resolveEntry(configEntry)

    //console.log(result)
    expect(result).toEqual([])
  })

  it("String", async () => {
    const configEntry = "src/assets/script.ts"
    const result = await resolveEntry(configEntry)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
      },
    ])
  })

  it("Array", async () => {
    const configEntry = ["src/assets/script.ts", "src/assets/style.css"]
    const result = await resolveEntry(configEntry)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
      },
      {
        name: "style",
        input: "src/assets/style.css",
        insertPages: ["**/*"],
      },
    ])
  })

  it("Object", async () => {
    const configEntry = { script: "src/assets/index.ts" }
    const result = await resolveEntry(configEntry)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/index.ts",
        insertPages: ["**/*"],
      },
    ])
  })

  it("Array object", async () => {
    const configEntry = [
      {
        name: "test1",
        input: "src/assets/test1.ts",
        insertPages: ["/test/test1/**/*", "/test/test1/"],
      },
      {
        name: "test2",
        input: "src/assets/test2.ts",
        insertPages: ["/test/test2/**/*", "!/test/test2/"],
      },
      {
        name: "style",
        input: "src/assets/style.css",
        insertPages: {
          include: ["**/*"],
          exclude: ["/test/test2/"],
        },
      },
    ]
    const result = await resolveEntry(configEntry)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "test1",
        input: "src/assets/test1.ts",
        insertPages: ["/test/test1/**/*", "/test/test1/"],
      },
      {
        name: "test2",
        input: "src/assets/test2.ts",
        insertPages: ["/test/test2/**/*", "!/test/test2/"],
      },
      {
        name: "style",
        input: "src/assets/style.css",
        insertPages: ["**/*", "!/test/test2/"],
      },
    ])
  })
})
