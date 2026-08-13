import type { Diagnostic } from "../../core/diagnostics/index.js"

export interface ViteBuildErrorOptions {
  readonly environment: string
  readonly root: string
}

export declare class ViteBuildError extends Error {
  readonly code: "MINISTA_VITE_BUILD_FAILED"
  readonly environment: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: ViteBuildErrorOptions)
}

export declare function normalizeViteBuildError(
  error: unknown,
  options: ViteBuildErrorOptions,
): Error
