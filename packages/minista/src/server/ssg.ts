import type { ResolvedConfig } from "../config/index.js"
import type { SsgPages } from "../transform/ssg.js"
import { getSources } from "./source.js"
import { transformSsg } from "../transform/ssg.js"

export type RunSsg = {
  (config: ResolvedConfig): Promise<SsgPages>
}

export async function runSsg(config: ResolvedConfig): Promise<SsgPages> {
  const { resolvedGlobal, resolvedPages } = await getSources()

  if (!resolvedPages.length) {
    return []
  }
  return await transformSsg({
    command: "build",
    resolvedGlobal,
    resolvedPages,
    config,
  })
}
