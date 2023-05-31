import type { ResolvedGlobal } from "./global.js"
import type { ResolvedPages } from "./page.js"
import { getGlobal, resolveGlobal } from "./global.js"
import { getPages, resolvePages } from "./page.js"

export type GetSources = {
  (): Promise<{ resolvedGlobal: ResolvedGlobal; resolvedPages: ResolvedPages }>
}
export type Sources = {
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
}

export async function getSources(): Promise<Sources> {
  const global = getGlobal()
  const pages = getPages()
  const resolvedGlobal = await resolveGlobal(global)
  const resolvedPages = await resolvePages(pages)
  return {
    resolvedGlobal,
    resolvedPages,
  }
}
