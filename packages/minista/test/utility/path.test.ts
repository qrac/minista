import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { getHtmlPath, getNodeModulesPath } from "../../src/utility/path"

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

describe("getNodeModulesPath", () => {
  it("Default", () => {
    const result = getNodeModulesPath(__dirname)

    //console.log(result)
    expect(result).toEqual(path.join(process.cwd(), "node_modules"))
  })

  it("Custom root", () => {
    const result = getNodeModulesPath(path.join(__dirname, "../_demo"))

    //console.log(result)
    expect(result).toEqual(path.join(__dirname, "../_demo", "node_modules"))
  })
})
