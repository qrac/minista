import type { FilledContext } from "react-helmet-async"
import ReactDOMServer from "react-dom/server"
import { StaticRouter } from "react-router-dom/server"
import { HelmetProvider } from "react-helmet-async"

import type { ResolvedGlobal } from "./global"
import type { ResolvedPages } from "./pages"
import { App } from "./app"

export function convertReactToHtml({
  url,
  resolvedGlobal,
  resolvedPages,
  useDevelopBundle,
}: {
  url: string
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
  useDevelopBundle: boolean
}): string {
  const helmetContext = {}

  const markup = ReactDOMServer.renderToString(
    <StaticRouter location={url}>
      <HelmetProvider context={helmetContext}>
        <App resolvedGlobal={resolvedGlobal} resolvedPages={resolvedPages} />
      </HelmetProvider>
    </StaticRouter>
  )

  const { helmet } = helmetContext as FilledContext

  const staticHelmet = (data: string) => {
    return data.replace(/data-rh="true"/g, "")
  }
  const htmlAttributes = Object.hasOwn(
    helmet.htmlAttributes.toComponent(),
    "lang"
  )
    ? helmet.htmlAttributes.toString()
    : `lang="ja" ${helmet.htmlAttributes.toString()}`
  const developBundleScript = useDevelopBundle
    ? `\n<script type="module">import "/@minista/dist/server/bundle.js"</script>`
    : ""

  const html = `
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
    </head>
    <body ${helmet.bodyAttributes.toString()}>
      ${markup}${developBundleScript}
    </body>
  </html>
`
  return html
}
