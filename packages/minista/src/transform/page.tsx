import type { FilledContext } from "react-helmet-async"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router-dom/server.js"
import { HelmetProvider } from "react-helmet-async"
import { Route, Routes } from "react-router-dom"

import type { PageProps } from "../shared/index.js"
import type { ResolvedGlobal } from "../server/global.js"
import type { ResolvedPages } from "../server/page.js"

function Wrap({
  component,
  props,
  children,
}: {
  component?: new () => React.Component<PageProps>
  props: PageProps
  children: React.ReactNode
}) {
  const WrapComponent = component
  return (
    <>
      {WrapComponent ? (
        <WrapComponent {...props}>{children}</WrapComponent>
      ) : (
        <>{children}</>
      )}
    </>
  )
}

function Page({
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
          const WrapComponent = Wrap
          const PageComponent = page.component
          const props: PageProps = {
            title: "",
            group: "",
            draft: false,
            ...global.metadata,
            ...page.metadata,
            ...global.staticData.props,
            ...page.staticData.props,
            url: page.path,
            location: { pathname: page.path },
            frontmatter: page.frontmatter,
          }
          return (
            <Route
              key={page.path}
              path={page.path}
              element={
                <WrapComponent component={global.component} props={props}>
                  <PageComponent {...props} />
                </WrapComponent>
              }
            />
          )
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

  let markup = renderToString(
    <StaticRouter location={url}>
      <HelmetProvider context={helmetContext}>
        <Page resolvedGlobal={resolvedGlobal} resolvedPages={resolvedPages} />
      </HelmetProvider>
    </StaticRouter>
  )

  markup = markup.replace(/(?<=\<[img|source].+?)(srcSet=)/g, "srcset=")

  const { helmet } = helmetContext as FilledContext

  let htmlAttributes = ` lang="ja" ${helmet.htmlAttributes.toString()}`
  let bodyAttributes = ""

  if (Object.hasOwn(helmet.htmlAttributes.toComponent(), "lang")) {
    htmlAttributes = " " + helmet.htmlAttributes.toString()
  }
  if (helmet.bodyAttributes) {
    bodyAttributes = " " + helmet.bodyAttributes.toString()
  }

  const metaAll = helmet.meta.toString()

  const metaCharsetDefault = `<meta charset="UTF-8" />`
  const metaCharsetReg = /<meta[^<>]*?charset=.*?\/>/gi
  const metaCharsetArray = metaAll.match(metaCharsetReg) || [""]

  const metaViewportDefault = `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
  const metaViewportReg = /<meta[^<>]*?name="viewport".*?\/>/gi
  const metaViewportArray = metaAll.match(metaViewportReg) || [""]

  let metaCharset: string
  metaCharset = metaCharsetArray.at(-1) || ""
  metaCharset = metaCharset || metaCharsetDefault

  let metaViewport: string
  metaViewport = metaViewportArray.at(-1) || ""
  metaViewport = metaViewport || metaViewportDefault

  let metaOther: string
  metaOther = metaAll || ""
  metaOther = metaOther.replace(metaCharsetReg, "").replace(metaViewportReg, "")

  const insertHeadTags = headTags ? headTags : ""
  const insertStartTags = startTags ? `${startTags}\n` : ""
  const insertEndTags = endTags ? `\n${endTags}` : ""

  function staticHelmet(data: string) {
    return data.replace(/\sdata-rh="true"/g, "")
  }
  return `<!doctype html>
<html${htmlAttributes}>
  <head>
    ${staticHelmet(metaCharset)}
    ${staticHelmet(metaViewport)}
    ${staticHelmet(helmet.title.toString())}
    ${staticHelmet(metaOther)}
    ${staticHelmet(helmet.link.toString())}
    ${staticHelmet(helmet.script.toString())}
    ${insertHeadTags}
    ${staticHelmet(helmet.style.toString())}
  </head>
  <body${bodyAttributes}>
    ${insertStartTags}${markup}${insertEndTags}
  </body>
</html>`
}
