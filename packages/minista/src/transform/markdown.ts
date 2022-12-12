import type { HTMLElement as NHTMLElement } from "node-html-parser"
import { parse as parseHtml } from "node-html-parser"
import { compile as compileMdx, run as runMdx } from "@mdx-js/mdx"
import { createElement } from "react"
import { renderToString } from "react-dom/server"

import type { ResolvedMdxConfig } from "../config/mdx.js"

export async function transformMarkdown(
  parsedHtml: NHTMLElement,
  config: ResolvedMdxConfig
) {
  let _parsedHtml = parsedHtml

  const targets = _parsedHtml.querySelectorAll(
    `[data-minista-transform-target="markdown"]`
  )

  await Promise.all(
    targets.map(async (target) => {
      const parent = target.parentNode
      const childs = target.childNodes
      const childsStr = childs.toString()
      const content = await compileMdx(childsStr, config)

      let contentStr = content.value.toString()

      contentStr = contentStr.replace(
        /import {(.+?)} from "react\/jsx-runtime"/,
        'const {$1} = await import("react/jsx-runtime")'
      )
      contentStr = contentStr.replace(/\sas[(^const.*await import.*?)]/g, ": ")
      contentStr = contentStr.replace(
        /export default MDXContent/g,
        "return MDXContent"
      )
      contentStr = contentStr.replace(/\nexport.*;/g, "\n")

      const contentReact = createElement(await runMdx(contentStr, {}))
      const contentHtml = renderToString(contentReact)

      const parsedContent = parseHtml(contentHtml)
      return parent.exchangeChild(target, parsedContent)
    })
  )

  return _parsedHtml
}
