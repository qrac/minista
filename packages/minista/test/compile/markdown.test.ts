import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import { resolveConfig } from "../../src/config"
import { compileMarkdown } from "../../src/compile/markdown"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("compileComment", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const htmlPath = "../_demo/fetch.html"
    const htmlFile = path.relative(".", path.join(__dirname, htmlPath))
    const html = await fs.readFile(htmlFile, "utf8")
    const result = await compileMarkdown(html, config.mdx)

    //console.log(result)
    expect(
      result.includes(`data-minista-compile-target="markdown"`)
    ).toBeFalsy()
  })
})
