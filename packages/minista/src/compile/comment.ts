import { parse as parseHtml } from "node-html-parser"

export function compileOneComment(text: string): string {
  return "<!-- " + text + " -->"
}

export function compileMultiComment(text: string): string {
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

export function compileComment(html: string): string {
  let parsedHtml = parseHtml(html)

  const targets = parsedHtml.querySelectorAll(
    `[data-minista-compile-target="comment"]`
  )

  targets.map((target) => {
    let commentTag = ""

    const parent = target.parentNode
    const text = target.innerText

    if (!text.includes("\n")) {
      commentTag = compileOneComment(text)
    } else {
      commentTag = compileMultiComment(text)
    }
    const content = "\n\n" + commentTag + "\n\n"
    const parsedContent = parseHtml(content, { comment: true })
    return parent.exchangeChild(target, parsedContent)
  })

  const htmlStr = parsedHtml.toString()
  return htmlStr
}
