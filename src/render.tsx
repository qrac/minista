import { renderToStaticMarkup } from "react-dom/server.js"
import { Helmet } from "react-helmet"

import { PageJsxContent } from "./types.js"

export async function renderHtml(
  pageJsxContent: PageJsxContent,
  assetsTagStr?: string
) {
  const markup = renderToStaticMarkup(pageJsxContent)
  const helmet = Helmet.renderStatic()
  const staticHelmet = (data: string) => {
    return data.replace(/data-react-helmet="true"/g, "")
  }
  const htmlAttributes = Object.hasOwn(
    helmet.htmlAttributes.toComponent(),
    "lang"
  )
    ? helmet.htmlAttributes.toString()
    : `lang="ja" ${helmet.htmlAttributes.toString()}`
  return `
    <!doctype html>
    <html ${htmlAttributes}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${staticHelmet(helmet.title.toString())}
        ${staticHelmet(helmet.meta.toString())}
        ${staticHelmet(helmet.link.toString())}
        ${staticHelmet(helmet.style.toString())}
        ${staticHelmet(helmet.script.toString())}
        ${assetsTagStr && assetsTagStr}
      </head>
      <body ${helmet.bodyAttributes.toString()}>
        ${markup}
      </body>
    </html>
  `
}
