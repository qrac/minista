import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import { compileComment } from "../../src/compile/comment"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
