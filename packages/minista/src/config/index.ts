import type { UserConfig } from "./user.js"
import type { ResolvedMainConfig } from "./main.js"
import type { ResolvedSubConfig } from "./sub.js"
import type { ResolvedMdxConfig } from "./mdx.js"
import type { ResolvedViteConfig } from "./vite.js"
import { resolveUserConfig } from "./user.js"
import { resolveMainConfig } from "./main.js"
import { resolveSubConfig } from "./sub.js"
import { resolveMdxConfig } from "./mdx.js"
import { resolveViteConfig } from "./vite.js"

export type InlineConfig = UserConfig & {
  configFile?: string | false
}

export type ResolvedConfig = {
  main: ResolvedMainConfig
  sub: ResolvedSubConfig
  mdx: ResolvedMdxConfig
  vite: ResolvedViteConfig
}

export async function resolveConfig(
  inlineConfig: InlineConfig
): Promise<ResolvedConfig> {
  const resolvedUserConfig = await resolveUserConfig(inlineConfig)
  const resolvedMainConfig = await resolveMainConfig(resolvedUserConfig)
  const resolvedSubConfig = await resolveSubConfig(resolvedMainConfig)
  const resolvedMdxConfig = await resolveMdxConfig(resolvedMainConfig)
  const resolvedViteConfig = await resolveViteConfig(
    resolvedMainConfig,
    resolvedSubConfig
  )

  const resolvedConfig: ResolvedConfig = {
    main: resolvedMainConfig,
    sub: resolvedSubConfig,
    mdx: resolvedMdxConfig,
    vite: resolvedViteConfig,
  }
  return resolvedConfig
}
