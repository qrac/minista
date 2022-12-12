import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import { parse as parseHtml } from "node-html-parser"

import { resolveConfig } from "../../src/config"
import { transformMarkdown } from "../../src/transform/markdown"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("transformComment", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const htmlPath = "../_data/fetch.html"
    const htmlFile = path.relative(".", path.join(__dirname, htmlPath))
    const html = await fs.readFile(htmlFile, "utf8")
    const parsedHtml = parseHtml(html)
    const result = await transformMarkdown(parsedHtml, config.mdx)

    //console.log(result)
    expect(
      result.toString().includes(`data-minista-transform-target="markdown"`)
    ).toBeFalsy()
  })
})
