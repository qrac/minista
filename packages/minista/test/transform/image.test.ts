import { describe, expect, it } from "vitest"

import { parse as parseHtml } from "node-html-parser"

import { resolveConfig } from "../../src/config"
import { transformRelativeImages } from "../../src/transform/image"

describe("transformRelativeImages", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    const pathname = "/about/"
    const html = `<img src="/assets/images/image.png">`
    const parsedHtml = parseHtml(html)

    const result = transformRelativeImages({
      parsedHtml,
      pathname,
      config,
    })

    //console.log(result)
    expect(result.toString()).toEqual(`<img src="../assets/images/image.png">`)
  })
})
