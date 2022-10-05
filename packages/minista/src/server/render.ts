import { getGlobal, resolveGlobal } from "./global"
import { getPages, resolvePages } from "./pages"
import { convertReactToHtml } from "./convert"

export type Render = {
  (url: string): Promise<string>
}

export const render: Render = async (url) => {
  const global = getGlobal()
  const pages = getPages()
  const resolvedGlobal = await resolveGlobal(global)
  const resolvedPages = await resolvePages(pages)

  const html = convertReactToHtml({
    url,
    resolvedGlobal,
    resolvedPages,
    useDevelopBundle: true,
  })
  return html
}
