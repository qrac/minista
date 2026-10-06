import type { ChildProcess, SpawnOptions } from "node:child_process"
import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { BuildPhase } from "../../core/types.js"

export interface ViteCliProcessOptions {
  readonly environment?: string
  readonly phase?: BuildPhase
  readonly variables?: Readonly<Record<string, string>>
}

export interface ViteCliProcessErrorOptions {
  readonly environment: string
  readonly phase?: BuildPhase
  readonly exitCode?: number | null
  readonly signal?: NodeJS.Signals | null
  readonly cause?: Error
}

export declare class ViteCliProcessError extends Error {
  readonly code: "MINISTA_VITE_CLI_FAILED"
  readonly environment: string
  readonly exitCode?: number | null
  readonly signal?: NodeJS.Signals | null
  readonly diagnostic: Diagnostic
  constructor(options: ViteCliProcessErrorOptions)
}

export declare class ViteCliProcessAdapter {
  constructor(
    factory?: (
      command: string,
      args: readonly string[],
      options: SpawnOptions,
    ) => ChildProcess,
  )
  run(args: readonly string[], options?: ViteCliProcessOptions): Promise<number>
}
