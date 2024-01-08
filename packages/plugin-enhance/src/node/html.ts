import type { HTMLElement as NHTMLElement } from "node-html-parser"

import type { ResolvedPage } from "../@types/node"

export function transformHtml({
  resolvedPage,
}: {
  resolvedPage: ResolvedPage
}) {
  let html = resolvedPage.parsedHtml

  const { commands } = resolvedPage

  //console.log("resolvedPage:", resolvedPage)

  if (!commands.length) {
    return html.toString()
  }
  commands.map((command) => {
    const { selector, selectorAll, attr, pattern, value } = command
    const method = command.method ?? "replace"
    const newHtml = command.parsedHtml

    let targets: NHTMLElement[] = []

    if (selector) {
      const target = html.querySelector(selector)
      targets = target ? [target] : []
    }
    if (selectorAll) {
      targets = html.querySelectorAll(selectorAll)
    }
    if (!targets.length) {
      return
    }

    if (method === "remove") {
      return targets.map((target) => target.remove())
    }
    if (method === "replace" && newHtml) {
      return targets.map((target) => target.replaceWith(newHtml))
    }
    if (method === "insert" && newHtml) {
      const position = (() => {
        switch (command.position) {
          case "before":
            return "beforebegin"
          case "after":
            return "afterend"
          case "start":
            return "afterbegin"
          case "end":
            return "beforeend"
          default:
            return "beforeend"
        }
      })()
      return targets.map((target) =>
        target.insertAdjacentHTML(position, newHtml.toString())
      )
    }
    if (attr && pattern && value) {
      return targets.map((target) => {
        const oldValue = target.getAttribute(attr)

        if (oldValue) {
          const newValue = oldValue.replace(pattern, value)
          target.setAttribute(attr, newValue)
        }
        return
      })
    }
    if (attr && value) {
      return targets.map((target) => target.setAttribute(attr, value))
    }
    if (attr && value === undefined) {
      return targets.map((target) => target.removeAttribute(attr))
    }
    if (value) {
      return targets.map((target) => target.set_content(value))
    }
  })
  return html.toString()
}
