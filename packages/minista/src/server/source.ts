import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedGlobal } from "./global.js"
import type { ResolvedPages } from "./page.js"
import { getGlobal, resolveGlobal } from "./global.js"
import { getPages, resolvePages } from "./page.js"
import { getStories } from "./story.js"

export type GetSources = {
  (config: ResolvedConfig): Promise<{
    resolvedGlobal: ResolvedGlobal
    resolvedPages: ResolvedPages
  }>
}
export type Sources = {
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
}

export async function getSources(config: ResolvedConfig): Promise<Sources> {
  const global = getGlobal()
  const pages = getPages()
  const { storyPages, storyItems } = getStories(config)
  const resolvedGlobal = await resolveGlobal(global)
  const resolvedPages = await resolvePages([...pages, ...storyPages])
  return {
    resolvedGlobal,
    resolvedPages,
  }
}
