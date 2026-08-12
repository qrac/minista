import type { InlineConfig } from "vite"

export interface ViteAppEnvironmentNames {
  readonly renderName?: string
  readonly clientName?: string
}

export declare function createViteAppConfig(
  config: InlineConfig,
  names?: ViteAppEnvironmentNames,
): InlineConfig
