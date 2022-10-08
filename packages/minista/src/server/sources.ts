import type { ResolvedGlobal } from "./global.js"
import type { ResolvedPages } from "./pages.js"
import { getGlobal, resolveGlobal } from "./global.js"
import { getPages, resolvePages } from "./pages.js"

export type GetSources = {
  (): Promise<{ resolvedGlobal: ResolvedGlobal; resolvedPages: ResolvedPages }>
}

export const getSources: GetSources = async () => {
  const global = getGlobal()
  const pages = getPages()
  const resolvedGlobal = await resolveGlobal(global)
  const resolvedPages = await resolvePages(pages)
  return {
    resolvedGlobal,
    resolvedPages,
  }
}
