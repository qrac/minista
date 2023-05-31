import { describe, expect, it } from "vitest"

import type { EntryPatterns, ResolvedEntry } from "../../src/config/entry"
import {
  resolveEntryInclude,
  resolveEntryExclude,
  resolveViteEntry,
  resolveEntry,
} from "../../src/config/entry"

describe("resolveEntryInclude", () => {
  it("String", () => {
    const result = resolveEntryInclude("/test/test1")
    expect(result).toEqual(["/test/test1"])
  })

  it("Array", () => {
    const result = resolveEntryInclude(["/test/test1", "/test/test2"])
    expect(result).toEqual(["/test/test1", "/test/test2"])
  })

  it("Object", () => {
    const result = resolveEntryInclude({ include: ["/test/test1"] })
    expect(result).toEqual(["/test/test1"])
  })
})

describe("resolveEntryExclude", () => {
  it("String", () => {
    const result = resolveEntryExclude("/test/test1")
    expect(result).toEqual([])
  })

  it("Array", () => {
    const result = resolveEntryExclude(["/test/test1", "!/test/test2"])
    expect(result).toEqual(["/test/test2"])
  })

  it("Object", () => {
    const result = resolveEntryExclude({
      include: ["/test/test1"],
      exclude: ["/test/test2"],
    })
    expect(result).toEqual(["/test/test2"])
  })
})

describe("resolveViteEntry", () => {
  it("No entry", () => {
    const result = resolveViteEntry("", [])
    expect(result).toEqual({})
  })

  it("Set entry", () => {
    const entries: ResolvedEntry = [
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
    ]
    const result = resolveViteEntry("", entries)
    expect(result).toEqual({ script: "src/assets/script.ts" })
  })
})

describe("resolveEntry", () => {
  it("No props", async () => {
    const configEntry: EntryPatterns = ""
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([])
  })

  it("String", async () => {
    const configEntry: EntryPatterns = "src/assets/script.ts"
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
    ])
  })

  it("Array", async () => {
    const configEntry: EntryPatterns = [
      "src/assets/script.ts",
      "src/assets/style.css",
    ]
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
      {
        name: "style",
        input: "src/assets/style.css",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
    ])
  })

  it("Array (duplicate)", async () => {
    const configEntry: EntryPatterns = [
      "src/assets/index.ts",
      "src/assets/index.css",
    ]
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([
      {
        name: "index-ministaDuplicateName0",
        input: "src/assets/index.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
      {
        name: "index-ministaDuplicateName1",
        input: "src/assets/index.css",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
    ])
  })

  it("Object", async () => {
    const configEntry: EntryPatterns = { script: "src/assets/index.ts" }
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([
      {
        name: "script",
        input: "src/assets/index.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
    ])
  })

  it("Array object", async () => {
    const configEntry: EntryPatterns = [
      {
        name: "test1",
        input: "src/assets/test1.ts",
        insertPages: ["/test/test1/**/*", "/test/test1/"],
        position: "start",
        attributes: "async",
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
        attributes: "defer",
      },
    ]
    const result = await resolveEntry(configEntry)
    expect(result).toEqual([
      {
        name: "test1",
        input: "src/assets/test1.ts",
        insertPages: {
          include: ["/test/test1/**/*", "/test/test1/"],
          exclude: [],
        },
        position: "start",
        attributes: "async",
      },
      {
        name: "test2",
        input: "src/assets/test2.ts",
        insertPages: {
          include: ["/test/test2/**/*"],
          exclude: ["/test/test2/"],
        },
        position: "head",
        attributes: "",
      },
      {
        name: "style",
        input: "src/assets/style.css",
        insertPages: {
          include: ["**/*"],
          exclude: ["/test/test2/"],
        },
        position: "head",
        attributes: "defer",
      },
    ])
  })
})
