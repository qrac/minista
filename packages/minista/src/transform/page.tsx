import type { FilledContext } from "react-helmet-async"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router-dom/server.js"
import { HelmetProvider } from "react-helmet-async"
import { Route, Routes } from "react-router-dom"

import type { ResolvedGlobal } from "../server/global.js"
import type { ResolvedPages } from "../server/pages.js"

export function Page({
  resolvedGlobal,
  resolvedPages,
}: {
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
}) {
  const global = resolvedGlobal
  const routes = resolvedPages
  return (
    <>
      <Routes>
        {routes.map((page) => {
          const location = { pathname: page.path }

          if (global.component) {
            const GlobalComponent = global.component
            const PageComponent = page.component
            return (
              <Route
                key={page.path}
                path={page.path}
                element={
                  <GlobalComponent
                    {...global.staticData.props}
                    {...page.staticData.props}
                    frontmatter={page.frontmatter}
                    location={location}
                  >
                    <PageComponent
                      {...global.staticData.props}
                      {...page.staticData.props}
                      frontmatter={page.frontmatter}
                      location={location}
                    />
                  </GlobalComponent>
                }
              ></Route>
            )
          } else {
            const PageComponent = page.component
            return (
              <Route
                key={page.path}
                path={page.path}
                element={
                  <PageComponent
                    {...global.staticData.props}
                    {...page.staticData.props}
                    frontmatter={page.frontmatter}
                    location={location}
                  />
                }
              ></Route>
            )
          }
        })}
      </Routes>
    </>
  )
}

export function transformPage({
  url,
  resolvedGlobal,
  resolvedPages,
  headTags,
  startTags,
  endTags,
}: {
  url: string
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
  headTags?: string
  startTags?: string
  endTags?: string
}): string {
  const helmetContext = {}

  const markup = renderToString(
    <StaticRouter location={url}>
      <HelmetProvider context={helmetContext}>
        <Page resolvedGlobal={resolvedGlobal} resolvedPages={resolvedPages} />
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

  const insertHeadTags = headTags ? headTags : ""
  const insertStartTags = startTags ? `${startTags}\n` : ""
  const insertEndTags = endTags ? `\n${endTags}` : ""

  const html = `
  <!doctype html>
  <html ${htmlAttributes}>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      ${staticHelmet(helmet.title.toString())}
      ${staticHelmet(helmet.meta.toString())}
      ${staticHelmet(helmet.link.toString())}
      ${staticHelmet(helmet.script.toString())}
      ${insertHeadTags}
      ${staticHelmet(helmet.style.toString())}
    </head>
    <body ${helmet.bodyAttributes.toString()}>
      ${insertStartTags}${markup}${insertEndTags}
    </body>
  </html>
`
  return html
}
