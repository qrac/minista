import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import { parse as parseHtml } from "node-html-parser"

import {
  transformOneComment,
  transformMultiComment,
  transformComment,
} from "../../src/transform/comment"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("transformOneComment", () => {
  it("Default", () => {
    const result = transformOneComment("test")

    //console.log(result)
    expect(result).toEqual(`<!-- test -->`)
  })
})

describe("transformMultiComment", () => {
  it("Default", () => {
    const result = transformMultiComment(`test
test 2
test 3`)

    //console.log(result)
    expect(result).toEqual(`<!--
  test
  test 2
  test 3
-->`)
  })
})

describe("transformComment", () => {
  it("Default", async () => {
    const htmlPath = "../_data/comment.html"
    const htmlFile = path.relative(".", path.join(__dirname, htmlPath))
    const html = await fs.readFile(htmlFile, "utf8")
    const parsedHtml = parseHtml(html)
    const result = transformComment(parsedHtml)

    //console.log(result)
    expect(
      result.toString().includes(`data-minista-transform-target="comment"`)
    ).toBeFalsy()
  })
})
