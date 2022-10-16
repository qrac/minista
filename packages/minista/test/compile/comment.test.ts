import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import {
  compileOneComment,
  compileMultiComment,
  compileComment,
} from "../../src/compile/comment"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("compileOneComment", () => {
  it("Default", () => {
    const result = compileOneComment("test")

    //console.log(result)
    expect(result).toEqual(`<!-- test -->`)
  })
})

describe("compileMultiComment", () => {
  it("Default", () => {
    const result = compileMultiComment(`test
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

describe("compileComment", () => {
  it("Default", async () => {
    const htmlPath = "../_demo/comment.html"
    const htmlFile = path.relative(".", path.join(__dirname, htmlPath))
    const html = await fs.readFile(htmlFile, "utf8")
    const result = compileComment(html)

    //console.log(result)
    expect(result.includes(`data-minista-compile-target="comment"`)).toBeFalsy()
  })
})
