import path from "node:path"
import { normalizePath } from "vite"

import type { ResolvedMainConfig } from "./main.js"
import type { ResolvedEntry } from "./entry.js"
import type { ResolvedAlias } from "./alias.js"
import { resolveEntry } from "./entry.js"
import { resolveAlias } from "./alias.js"

export type ResolvedSubConfig = {
  resolvedRoot: string
  resolvedEntry: ResolvedEntry
  resolvedAlias: ResolvedAlias
}

export async function resolveSubConfig(
  mainConfig: ResolvedMainConfig
): Promise<ResolvedSubConfig> {
  const resolvedRoot = normalizePath(
    mainConfig.root ? path.resolve(mainConfig.root) : process.cwd()
  )

  const configEntry = mainConfig.assets.entry
  const viteConfigEntry = mainConfig.vite.build?.rollupOptions?.input || ""
  const selectedEntry = configEntry || viteConfigEntry
  const resolvedEntry = await resolveEntry(selectedEntry, resolvedRoot)

  const configAlias = mainConfig.resolve.alias
  const viteConfigAlias = mainConfig.vite.resolve?.alias || {}
  const resolvedAlias = await resolveAlias(configAlias, viteConfigAlias)

  return {
    resolvedRoot,
    resolvedEntry,
    resolvedAlias,
  }
}
