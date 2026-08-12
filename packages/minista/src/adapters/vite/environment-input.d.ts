import type { BuildEnvironment } from "vite"

export type ViteEnvironmentInput =
  BuildEnvironment["config"]["build"]["rolldownOptions"]["input"]
export type ViteNamedEnvironmentInput = Readonly<Record<string, string>>

export declare class ViteEnvironmentInputMergeError extends Error {
  readonly code: "MINISTA_VITE_INPUT_NOT_NAMED"
}

export declare class ViteEnvironmentInputAdapter {
  apply(
    environment: BuildEnvironment,
    input: ViteEnvironmentInput,
  ): void
  merge(
    environment: BuildEnvironment,
    entries: ViteNamedEnvironmentInput,
  ): void
}
