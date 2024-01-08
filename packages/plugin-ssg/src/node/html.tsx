import { renderToString } from "react-dom/server"

import type { HeadData } from "minista-shared-head/shared"
import { HeadProvider } from "minista-shared-head"

import type { PageProps } from "../@types/shared.js"
import type { ResolvedLayout, ResolvedPage } from "../@types/node.js"

export function transformHtml({
  resolvedLayout,
  resolvedPage,
}: {
  resolvedLayout: ResolvedLayout
  resolvedPage: ResolvedPage
}): string {
  const layout = resolvedLayout
  const page = resolvedPage
  const Layout = layout.component as React.ComponentType<PageProps>
  const Page = page.component as React.ComponentType<PageProps>
  const hasLayout = layout.component ? true : false

  const props: PageProps = {
    title: "",
    draft: false,
    ...layout.metadata,
    ...page.metadata,
    ...layout.staticData.props,
    ...page.staticData.props,
    url: page.path,
  }

  let headData: HeadData = {}

  let markup = renderToString(
    <HeadProvider headData={headData}>
      {hasLayout ? (
        <Layout {...props}>
          <Page {...props} />
        </Layout>
      ) : (
        <Page {...props} />
      )}
    </HeadProvider>
  )

  markup = markup.replace(/(?<=\<[img|source].+?)(srcSet=)/g, "srcset=")

  //console.log("headData:", headData)
  //console.log("headData:", JSON.stringify(headData, null, 2))

  /*const { helmet } = helmetContext as { helmet: HelmetServerState }

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
  metaOther = metaOther.replace(metaCharsetReg, "").replace(metaViewportReg, "")*/
  return `<!doctype html><html><head></head><body>${markup}</body></html>`
}
