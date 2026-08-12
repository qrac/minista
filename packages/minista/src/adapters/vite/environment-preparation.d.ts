import type { BuildEnvironment, ViteBuilder } from "vite"

export type ViteBuildOutput = Awaited<ReturnType<ViteBuilder["build"]>>

export interface ViteEnvironmentPreparation {
  readonly builder: ViteBuilder
  readonly render: BuildEnvironment
  readonly client: BuildEnvironment
  readonly renderOutput: ViteBuildOutput
}

export declare class ViteEnvironmentPreparationError extends Error {
  readonly code: "MINISTA_VITE_PREPARATION_INVALID"
  readonly diagnostics: readonly import("../../core/diagnostics/index.js").Diagnostic[]
}

export declare function prepareViteClientEnvironment(
  preparation: ViteEnvironmentPreparation,
): Promise<void>
