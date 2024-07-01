import type { HTMLElement as NHTMLElement } from "node-html-parser"

import type { ResolvedPage } from "../@types/node"

export function transformHtml({
  resolvedPage,
}: {
  resolvedPage: ResolvedPage
}) {
  let html = resolvedPage.parsedHtml

  const { commands } = resolvedPage

  if (!commands.length) {
    return html.toString()
  }

  for (const command of commands) {
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
      continue
    }

    if (method === "remove") {
      for (const target of targets) {
        target.remove()
      }
      continue
    }
    if (method === "replace" && newHtml) {
      for (const target of targets) {
        target.replaceWith(newHtml)
      }
      continue
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
      for (const target of targets) {
        target.insertAdjacentHTML(position, newHtml.toString())
      }
      continue
    }
    if (attr && pattern && value) {
      for (const target of targets) {
        const oldValue = target.getAttribute(attr)
        if (oldValue) {
          const newValue = oldValue.replace(pattern, value)
          target.setAttribute(attr, newValue)
        }
      }
      continue
    }
    if (attr && value) {
      for (const target of targets) {
        target.setAttribute(attr, value)
      }
      continue
    }
    if (attr && value === undefined) {
      for (const target of targets) {
        target.removeAttribute(attr)
      }
      continue
    }
    if (value) {
      for (const target of targets) {
        target.set_content(value)
      }
      continue
    }
  }

  return html.toString()
}
