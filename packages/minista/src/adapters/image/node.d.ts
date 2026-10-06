import type { ImageGenerator } from "../../features/image/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"

export type NodeImageOperation =
  | "download"
  | "read"
  | "metadata"
  | "transform"
  | "cache"
export interface NodeImageErrorOptions {
  readonly operation: NodeImageOperation
  readonly rootDir: string
  readonly source: string
}
export declare class NodeImageError extends Error {
  readonly code:
    | "MINISTA_IMAGE_DOWNLOAD_FAILED"
    | "MINISTA_IMAGE_READ_FAILED"
    | "MINISTA_IMAGE_METADATA_FAILED"
    | "MINISTA_IMAGE_TRANSFORM_FAILED"
    | "MINISTA_IMAGE_CACHE_FAILED"
  readonly operation: NodeImageOperation
  readonly source: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: NodeImageErrorOptions)
}

export declare class NodeImageGenerator implements ImageGenerator {
  constructor(rootDir: string, cacheDir: string, resizeOnly?: boolean)
  generate: ImageGenerator["generate"]
}
