import { describe, expect, it } from "vitest"
import path from "path"

import { getFilePath, getFilePaths, getSameFilePaths } from "../src/path"

describe("getFilePath", () => {
  it("Test: getFilePath", () => {
    const result = getFilePath(".", "package", "json")

    //console.log(result)
    expect(result).toEqual(path.resolve("package.json"))
  })
})

describe("getFilePaths", () => {
  it("Test: getFilePaths", async () => {
    const result = await getFilePaths("./lib", "html")

    //console.log(result)
    expect(result).toEqual(["./lib/index.html"])
  })
})

describe("getSameFilePaths", () => {
  it("Test: getSameFilePaths", async () => {
    const result = await getSameFilePaths("./lib", "index", "html")

    //console.log(result)
    expect(result).toEqual(["./lib/index.html"])
  })
})
