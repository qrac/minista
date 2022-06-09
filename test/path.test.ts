import { describe, expect, it } from "vitest"
import path from "path"

import {
  getFilePath,
  getFilePaths,
  getFilterFilePaths,
  getSameFilePaths,
} from "../src/path"

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

describe("getFilterFilePaths", () => {
  it("Test: getFilterFilePaths", async () => {
    const result = await getFilterFilePaths({
      targetDir: "lib",
      include: ["**/*"],
      exclude: ["shim-react"],
      exts: "js",
    })

    //console.log(result)
    expect(result).toEqual(["lib/shim-fetch.js"])
  })
})

describe("getSameFilePaths", () => {
  it("Test: getSameFilePaths", async () => {
    const result = await getSameFilePaths("./lib", "index", "html")

    //console.log(result)
    expect(result).toEqual(["./lib/index.html"])
  })
})
