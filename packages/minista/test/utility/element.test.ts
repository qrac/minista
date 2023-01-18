import type { HTMLElement as NHTMLElement } from "node-html-parser"
import { describe, expect, it } from "vitest"
import { parse as parseHtml } from "node-html-parser"

import { getElements, cleanElement } from "../../src/utility/element"

describe("getElements", () => {
  it("Default", () => {
    const htmlStr = `<img src="" data-1><img src=""><img src="" data-1>`
    const parsedHtml = parseHtml(htmlStr) as NHTMLElement
    const elements = getElements(parsedHtml, "[data-1]")
    const result = elements.map((el) => el.toString()).join("")
    expect(result).toEqual(`<img src="" data-1><img src="" data-1>`)
  })

  it("Array", () => {
    const parsedData = [
      parseHtml(`<img src="" data-1>`) as NHTMLElement,
      parseHtml(`<img src="">`) as NHTMLElement,
      parseHtml(`<img src="" data-1>`) as NHTMLElement,
    ]
    const elements = getElements(parsedData, "[data-1]")
    const result = elements.map((el) => el.toString()).join("")
    expect(result).toEqual(`<img src="" data-1><img src="" data-1>`)
  })
})

describe("cleanElement", () => {
  it("Default", () => {
    const htmlStr = `<img src="" data-1="image" data-2="{}">`
    let parsedHtml = parseHtml(htmlStr) as NHTMLElement
    let el = parsedHtml.querySelector("img")
    if (el) {
      cleanElement(el, ["data-1", "data-2"])
      const result = el.toString()
      expect(result).toEqual(`<img src="">`)
    }
  })
})
