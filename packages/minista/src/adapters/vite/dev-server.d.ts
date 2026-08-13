import type { InlineConfig, ViteDevServer } from "vite"

export interface ViteDevServerResult {
  readonly server: ViteDevServer
  close(): Promise<void>
}
export declare class ViteDevServerAdapter {
  constructor(factory?: (config: InlineConfig) => Promise<ViteDevServer>)
  start(
    config: InlineConfig,
    options?: {
      readonly printUrls?: boolean
      readonly bindShortcuts?: boolean
    },
  ): Promise<ViteDevServerResult>
}
