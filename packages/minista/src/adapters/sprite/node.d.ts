import type { Config as SvgoConfig } from "svgo"
import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { SpriteBuilder } from "../../features/sprite/index.js"

export type NodeSpriteOperation = "discover" | "read" | "parse" | "optimize"
export interface NodeSpriteErrorOptions {
  readonly operation: NodeSpriteOperation
  readonly rootDir: string
  readonly source: string
}
export declare class NodeSpriteError extends Error {
  readonly code:
    | "MINISTA_SPRITE_DISCOVERY_FAILED"
    | "MINISTA_SPRITE_READ_FAILED"
    | "MINISTA_SPRITE_PARSE_FAILED"
    | "MINISTA_SPRITE_OPTIMIZE_FAILED"
  readonly operation: NodeSpriteOperation
  readonly source: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: NodeSpriteErrorOptions)
}

export declare class NodeSpriteBuilder implements SpriteBuilder {
  constructor(rootDir: string, config?: SvgoConfig)
  build(sourceDirectory: string): Promise<string>
}
