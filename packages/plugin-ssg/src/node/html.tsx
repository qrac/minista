import { renderToString } from "react-dom/server"

import type { HeadData } from "minista-shared-head/shared"
import {
  HeadProvider,
  transformAttrs,
  checkTagsCharset,
  checkTagsViewport,
  filterKeyTags,
  transformTags,
} from "minista-shared-head"

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

  const htmlAttrs = headData.htmlAttributes || {}
  const bodyAttrs = headData.bodyAttributes || {}
  const tags = headData.tags || []

  const htmlAttrStr = transformAttrs({ ...{ lang: "ja" }, ...htmlAttrs })
  const bodyAttrStr = transformAttrs(bodyAttrs)

  const hasCharset = checkTagsCharset(tags)
  const hasViewport = checkTagsViewport(tags)

  const addedTags = [
    !hasCharset && {
      type: "meta",
      key: null,
      props: {
        charset: "UTF-8",
      },
    },
    !hasViewport && {
      type: "meta",
      key: null,
      props: {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
    },
    headData.title && {
      type: "title",
      key: null,
      props: {
        children: headData.title,
      },
    },
    ...tags,
  ].filter((item) => item) as React.ReactElement[]
  const filterdTags = filterKeyTags(addedTags)
  const tagsStr = transformTags(filterdTags)

  return (
    `<!doctype html>` +
    `<html${htmlAttrStr ? " " + htmlAttrStr : ""}>` +
    `<head>` +
    tagsStr +
    `</head>` +
    `<body${bodyAttrStr ? " " + bodyAttrStr : ""}>` +
    markup +
    `</body></html>`
  )
}
