import { parse as parseHtml } from "node-html-parser"

export function compileComment(html: string): string {
  let parsedHtml = parseHtml(html)

  const targets = parsedHtml.querySelectorAll(
    `[data-minista-compile-target="comment"]`
  )

  targets.map((target) => {
    const parent = target.parentNode
    const text = target.innerText
    const space = text.includes("\n") ? "\n" : " "
    const content = "<!--" + space + text + space + "-->"
    const parsedContent = parseHtml(content, { comment: true })
    return parent.exchangeChild(target, parsedContent)
  })

  const htmlStr = parsedHtml.toString()
  return htmlStr
}
