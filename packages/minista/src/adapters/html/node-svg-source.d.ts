import type { Config as SvgoConfig } from "svgo"
import type { Diagnostic } from "../../core/diagnostics/index.js"
import type {
  SvgSource,
  SvgSourceResolver,
} from "../../features/svg/index.js"

export type NodeSvgSourceOperation = "read" | "optimize" | "parse"
export interface NodeSvgSourceErrorOptions {
  readonly operation: NodeSvgSourceOperation
  readonly rootDir: string
  readonly sourcePath: string
}
export declare class NodeSvgSourceError extends Error {
  readonly code:
    | "MINISTA_SVG_READ_FAILED"
    | "MINISTA_SVG_OPTIMIZE_FAILED"
    | "MINISTA_SVG_PARSE_FAILED"
  readonly operation: NodeSvgSourceOperation
  readonly sourcePath: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: NodeSvgSourceErrorOptions)
}

export declare class NodeSvgSourceResolver implements SvgSourceResolver {
  constructor(rootDir: string, config?: SvgoConfig)
  resolve(sourcePath: string): Promise<SvgSource | undefined>
}
