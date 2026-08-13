import type { InlineConfig, ViteDevServer } from "vite"
import type { Diagnostic } from "../../core/diagnostics/index.js"

export type ViteDevServerOperation =
  | "create"
  | "listen"
  | "configure"
  | "close"

export declare class ViteDevServerError extends Error {
  readonly code: "MINISTA_VITE_DEV_SERVER_FAILED"
  readonly operation: ViteDevServerOperation
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, operation: ViteDevServerOperation)
}

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
