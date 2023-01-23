import { describe, expect, it } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import {
  getHtmlPath,
  getRelativeAssetPath,
  getBasedAssetPath,
  getNodeModulesPath,
  getUniquePaths,
  isLocalPath,
} from "../../src/utility/path"

describe("getHtmlPath", () => {
  it("Default", () => {
    const result = getHtmlPath("/")

    //console.log(result)
    expect(result).toEqual("index.html")
  })

  it("Nest", () => {
    const result = getHtmlPath("/about")

    //console.log(result)
    expect(result).toEqual("about.html")
  })

  it("Nest 2", () => {
    const result = getHtmlPath("/about/")

    //console.log(result)
    expect(result).toEqual("about/index.html")
  })
})

describe("getRelativeAssetPath", () => {
  it("Default", () => {
    const result = getRelativeAssetPath({
      pathname: "/",
      assetPath: "style.css",
    })

    //console.log(result)
    expect(result).toEqual("style.css")
  })

  it("Has id", () => {
    const result = getRelativeAssetPath({
      pathname: "/",
      assetPath: "icons.svg#heart",
    })

    //console.log(result)
    expect(result).toEqual("icons.svg#heart")
  })

  it("Nest", () => {
    const result = getRelativeAssetPath({
      pathname: "/about/",
      assetPath: "style.css",
    })

    //console.log(result)
    expect(result).toEqual("../style.css")
  })
})

describe("getBasedAssetPath", () => {
  it("Default", () => {
    const result = getBasedAssetPath({
      base: "/",
      pathname: "/",
      assetPath: "style.css",
    })

    //console.log(result)
    expect(result).toEqual("/style.css")
  })

  it("Base", () => {
    const result = getBasedAssetPath({
      base: "./",
      pathname: "/",
      assetPath: "style.css",
    })

    //console.log(result)
    expect(result).toEqual("style.css")
  })

  it("Base with nest", () => {
    const result = getBasedAssetPath({
      base: "./",
      pathname: "/about/",
      assetPath: "style.css",
    })

    //console.log(result)
    expect(result).toEqual("../style.css")
  })
})

describe("getNodeModulesPath", () => {
  it("Default", () => {
    const result = getNodeModulesPath(__dirname)

    //console.log(result)
    expect(result).toEqual(path.join(process.cwd(), "node_modules"))
  })

  it("Custom root", () => {
    const result = getNodeModulesPath(path.join(__dirname, "../_data"))

    //console.log(result)
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

    //console.log(result)
    expect(result).toBeTruthy()
  })

  it("Protocol", () => {
    const result = isLocalPath(__dirname, "https://example.com/image.jpg")

    //console.log(result)
    expect(result).toBeFalsy()
  })

  it("No file", () => {
    const result = isLocalPath(__dirname, "test.js")

    //console.log(result)
    expect(result).toBeFalsy()
  })
})
