import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import { getSources } from "../server/sources.js"
import { renderApp } from "../server/app.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformMarkdown } from "../transform/markdown.js"
import { getHtmlPath } from "../utility/path.js"
import { resolveBase } from "../utility/base.js"

export type RunSsg = {
  (config: ResolvedConfig): Promise<SsgPage[]>
}
export type SsgPage = {
  fileName: string
  path: string
  html: string
}

export const runSsg: RunSsg = async (config) => {
  const resolvedBase = resolveBase(config.main.base)
  const { resolvedGlobal, resolvedPages } = await getSources()

  if (resolvedPages.length === 0) {
    return []
  }

  let htmlPages = resolvedPages.map((page) => {
    const basedPath = resolvedBase.match(/^\/.*\/$/)
      ? path.join(resolvedBase, page.path)
      : page.path
    const { headTags, startTags, endTags } = transformEntryTags({
      mode: "ssg",
      pathname: basedPath,
      config,
    })
    const draft = page.frontmatter?.draft || false
    return {
      path: page.path,
      basedPath,
      html: draft
        ? ""
        : renderApp({
            url: page.path,
            resolvedGlobal,
            resolvedPages: [page],
            headTags,
            startTags,
            endTags,
          }),
    }
  })

  htmlPages = htmlPages.filter((page) => page.html)

  if (htmlPages.length === 0) {
    return []
  }

  htmlPages = await Promise.all(
    htmlPages.map(async (page) => {
      let html = page.html

      if (html.includes(`data-minista-transform-target="comment"`)) {
        html = transformComment(html)
      }
      if (html.includes(`data-minista-transform-target="markdown"`)) {
        html = await transformMarkdown(html, config.mdx)
      }
      return {
        path: page.path,
        basedPath: page.basedPath,
        html,
      }
    })
  )

  return htmlPages.map((page) => {
    const fileName = getHtmlPath(page.path)
    return {
      fileName,
      path: page.basedPath,
      html: page.html,
    }
  }) as SsgPage[]
}
