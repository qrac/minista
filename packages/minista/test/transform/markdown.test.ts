import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import { resolveConfig } from "../../src/config"
import { transformMarkdown } from "../../src/transform/markdown"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("transformComment", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const htmlPath = "../_demo/fetch.html"
    const htmlFile = path.relative(".", path.join(__dirname, htmlPath))
    const html = await fs.readFile(htmlFile, "utf8")
    const result = await transformMarkdown(html, config.mdx)

    //console.log(result)
    expect(
      result.includes(`data-minista-transform-target="markdown"`)
    ).toBeFalsy()
  })
})
