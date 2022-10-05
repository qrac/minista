import { getGlobal, resolveGlobal } from "./global"
import { getPages, resolvePages } from "./pages"
import { convertReactToHtml } from "./convert"

export type PreRender = {
  (): Promise<HtmlPages>
}
type HtmlPages = { path: string; html: string }[]

export const preRender: PreRender = async () => {
  const global = getGlobal()
  const pages = getPages()
  const resolvedGlobal = await resolveGlobal(global)
  const resolvedPages = await resolvePages(pages)

  if (resolvedPages.length === 0) {
    return []
  }

  const htmlPages = resolvedPages.map((page) => {
    return {
      path: page.path,
      html: convertReactToHtml({
        url: page.path,
        resolvedGlobal,
        resolvedPages: [page],
        useDevelopBundle: false,
      }),
    }
  })
  return htmlPages
}
