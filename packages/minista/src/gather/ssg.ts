import type { ResolvedConfig } from "../config/index.js"
import { getSources } from "../server/sources.js"
import { compileEntryTags } from "../compile/tags.js"
import { compileApp } from "../compile/app.js"
import { compileComment } from "../compile/comment.js"
import { compileMarkdown } from "../compile/markdown.js"
import { getHtmlPath } from "../utility/path.js"

export type GatherSsg = {
  (config: ResolvedConfig): Promise<GatheredSsgPage[]>
}

type GatheredSsgPage = {
  fileName: string
  path: string
  html: string
}

export const gatherSsg: GatherSsg = async (config) => {
  const { resolvedGlobal, resolvedPages } = await getSources()

  if (resolvedPages.length === 0) {
    return []
  }

  let htmlPages = resolvedPages.map((page) => {
    const { headTags, startTags, endTags } = compileEntryTags({
      mode: "ssg",
      pathname: page.path,
      config,
    })
    return {
      path: page.path,
      html: compileApp({
        url: page.path,
        resolvedGlobal,
        resolvedPages: [page],
        headTags,
        startTags,
        endTags,
      }),
    }
  })

  if (htmlPages.length === 0) {
    return []
  }

  htmlPages = await Promise.all(
    htmlPages.map(async (page) => {
      let html = page.html

      if (html.includes(`data-minista-compile-target="comment"`)) {
        html = compileComment(html)
      }
      if (html.includes(`data-minista-compile-target="markdown"`)) {
        html = await compileMarkdown(html, config.mdx)
      }
      return {
        path: page.path,
        html,
      }
    })
  )

  return htmlPages.map((page) => {
    const fileName = getHtmlPath(page.path)
    return {
      fileName,
      path: page.path,
      html: page.html,
    }
  }) as GatheredSsgPage[]
}
