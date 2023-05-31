import type { HTMLElement as NHTMLElement } from "node-html-parser"

export function getElements(
  parsedData: NHTMLElement | NHTMLElement[],
  selector: string
) {
  if (Array.isArray(parsedData)) {
    return parsedData.map((data) => data.querySelectorAll(selector)).flat()
  } else {
    return parsedData.querySelectorAll(selector)
  }
}

export function hasElement(
  parsedData: NHTMLElement | NHTMLElement[],
  selector: string
) {
  if (Array.isArray(parsedData)) {
    return parsedData
      .map((data) => (data.querySelector(selector) ? true : false))
      .some((has) => has)
  } else {
    return parsedData.querySelector(selector) ? true : false
  }
}

export function cleanElement(el: NHTMLElement, attributes: string[]) {
  attributes.map((attribute) => el.removeAttribute(attribute))
}
