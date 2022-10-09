import { parse as parseHtml } from "node-html-parser"
import { compile as compileMdx, run as runMdx } from "@mdx-js/mdx"
import { createElement } from "react"
import ReactDOMServer from "react-dom/server"

import type { ResolvedMdxConfig } from "../config/mdx.js"

export async function compileMarkdown(
  html: string,
  config: ResolvedMdxConfig
): Promise<string> {
  let parsedHtml = parseHtml(html)

  const targets = parsedHtml.querySelectorAll(
    `[data-minista-compile-target="markdown"]`
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
      const contentHtml = ReactDOMServer.renderToString(contentReact)

      const parsedContent = parseHtml(contentHtml)
      return parent.exchangeChild(target, parsedContent)
    })
  )

  const htmlStr = parsedHtml.toString()
  return htmlStr
}