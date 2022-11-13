import type { ResolvedConfig } from "../config/index.js"
import { getSources } from "./sources.js"
import { transformPages } from "../transform/pages.js"

export type RunSsg = {
  (config: ResolvedConfig): Promise<SsgPage[]>
}
export type SsgPage = {
  fileName: string
  path: string
  title: string
  html: string
}

export async function runSsg(config: ResolvedConfig): Promise<SsgPage[]> {
  const { resolvedGlobal, resolvedPages } = await getSources()

  if (resolvedPages.length === 0) {
    return []
  }
  return await transformPages({ resolvedGlobal, resolvedPages, config })
}
