import type { HTMLElement as NHTMLElement } from "node-html-parser"
import { parse as parseHtml } from "node-html-parser"

export function transformOneComment(text: string) {
  return "<!-- " + text + " -->"
}

export function transformMultiComment(text: string) {
  let multiText = text
  let spaceArray: string[] = []
  let spaceNums: number[] = []
  let spaceMax = 0
  let startSpace = ""
  let endSpace = ""

  multiText = multiText.replace(/^(\n| )*/, "").replace(/(\n| )*$/, "")
  spaceArray = multiText.match(/[\n] */g) || []
  spaceArray = spaceArray.map((item) => item.replace(/\n/, ""))
  spaceNums = spaceArray.map((item) => item.length)
  spaceMax = spaceNums.reduce(function (a, b) {
    return Math.max(a, b)
  })
  spaceMax = spaceMax - 2 <= 2 ? 2 : spaceMax - 2
  startSpace = " ".repeat(spaceMax)
  endSpace = spaceMax === 2 ? "" : " ".repeat(spaceMax - 2)
  multiText = multiText.replace(/[\n] */g, "\n" + startSpace)

  return "<!--" + "\n" + startSpace + multiText + "\n" + endSpace + "-->"
}

export function transformComment(parsedHtml: NHTMLElement) {
  let _parsedHtml = parsedHtml

  const targets = _parsedHtml.querySelectorAll(
    `[data-minista-transform-target="comment"]`
  )

  targets.map((target) => {
    let commentTag = ""

    const parent = target.parentNode
    const text = target.innerText

    if (!text.includes("\n")) {
      commentTag = transformOneComment(text)
    } else {
      commentTag = transformMultiComment(text)
    }
    const content = "\n\n" + commentTag + "\n\n"
    const parsedContent = parseHtml(content, { comment: true })
    return parent.exchangeChild(target, parsedContent)
  })

  return _parsedHtml
}
