import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedGlobal } from "../server/global.js"
import type { ResolvedPages } from "../server/pages.js"
import { transformPage } from "./page.js"
import { transformEntryTags } from "./tags.js"
import { transformComment } from "./comment.js"
import { transformMarkdown } from "./markdown.js"
import { getHtmlPath } from "../utility/path.js"
import { resolveBase } from "../utility/base.js"

export async function transformPages({
  resolvedGlobal,
  resolvedPages,
  config,
}: {
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
  config: ResolvedConfig
}) {
  const resolvedBase = resolveBase(config.main.base)

  let pages = resolvedPages.map((page) => {
    const basedPath = resolvedBase.match(/^\/.*\/$/)
      ? path.join(resolvedBase, page.path)
      : page.path
    const { headTags, startTags, endTags } = transformEntryTags({
      mode: "ssg",
      pathname: basedPath,
      config,
    })
    const title = page.frontmatter?.title || ""
    const draft = page.frontmatter?.draft || false
    return {
      path: page.path,
      basedPath,
      title,
      html: draft
        ? ""
        : transformPage({
            url: page.path,
            resolvedGlobal,
            resolvedPages: [page],
            headTags,
            startTags,
            endTags,
          }),
    }
  })

  pages = pages.filter((page) => page.html)

  if (pages.length === 0) {
    return []
  }

  pages = await Promise.all(
    pages.map(async (page) => {
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
        title: page.title,
        html,
      }
    })
  )

  return pages.map((page) => {
    const fileName = getHtmlPath(page.path)
    return {
      fileName,
      path: page.basedPath,
      title: page.title,
      html: page.html,
    }
  })
}
