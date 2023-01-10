import type { HTMLElement as NHTMLElement } from "node-html-parser"

export function cleanElement(el: NHTMLElement, attributes: string[]) {
  for (const attribute of attributes) {
    el.removeAttribute(attribute)
  }
}
