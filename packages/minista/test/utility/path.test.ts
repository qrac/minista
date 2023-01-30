import { describe, expect, it } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import {
  getHtmlPath,
  getNodeModulesPath,
  getUniquePaths,
  isLocalPath,
} from "../../src/utility/path"

describe("getHtmlPath", () => {
  it("Default", () => {
    const result = getHtmlPath("/")
    expect(result).toEqual("index.html")
  })

  it("Nest", () => {
    const result = getHtmlPath("/about")
    expect(result).toEqual("about.html")
  })

  it("Nest 2", () => {
    const result = getHtmlPath("/about/")
    expect(result).toEqual("about/index.html")
  })
})

describe("getNodeModulesPath", () => {
  it("Default", () => {
    const result = getNodeModulesPath(__dirname)
    expect(result).toEqual(path.join(process.cwd(), "node_modules"))
  })

  it("Custom root", () => {
    const result = getNodeModulesPath(path.join(__dirname, "../_data"))
    expect(result).toEqual(path.join(__dirname, "../_data", "node_modules"))
  })
})

describe("getUniquePaths", () => {
  it("Default", () => {
    const urls = ["BB", "AA", "AA", "BB", "CC", "DD"]
    const result = getUniquePaths(urls)
    expect(result).toEqual(["AA", "BB", "CC", "DD"])
  })

  it("With excludes", () => {
    const urls = ["BB", "AA", "AA", "BB", "CC", "DD"]
    const excludes = ["BB", "CC"]
    const result = getUniquePaths(urls, excludes)
    expect(result).toEqual(["AA", "DD"])
  })
})

describe("isLocalPath", () => {
  it("Default", () => {
    const result = isLocalPath(__dirname, "path.test.ts")
    expect(result).toBeTruthy()
  })

  it("Protocol", () => {
    const result = isLocalPath(__dirname, "https://example.com/image.jpg")
    expect(result).toBeFalsy()
  })

  it("No file", () => {
    const result = isLocalPath(__dirname, "test.js")
    expect(result).toBeFalsy()
  })
})
