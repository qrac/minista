import type { BuildEnvironment } from "vite"

export type ViteEnvironmentInput =
  BuildEnvironment["config"]["build"]["rolldownOptions"]["input"]

export declare class ViteEnvironmentInputAdapter {
  apply(
    environment: BuildEnvironment,
    input: ViteEnvironmentInput,
  ): void
}
