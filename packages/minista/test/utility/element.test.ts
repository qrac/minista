import type { HTMLElement as NHTMLElement } from "node-html-parser"
import { describe, expect, it } from "vitest"
import { parse as parseHtml } from "node-html-parser"

import { cleanElement } from "../../src/utility/element"

describe("cleanElement", () => {
  it("Default", () => {
    let parsedHtml = parseHtml(
      `<img src="" data-test1="image" data-test2="{}">`
    ) as NHTMLElement
    let el = parsedHtml.querySelector("img")

    if (el) {
      cleanElement(el, ["data-test1", "data-test2"])

      const result = el.rawAttrs

      //console.log(result)
      expect(result).toEqual(`src=""`)
    }
  })
})
