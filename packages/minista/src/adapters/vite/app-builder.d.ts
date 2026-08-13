import type {
  BuildEnvironment,
  InlineConfig,
  ViteBuilder,
} from "vite"
import type { OutputManifest } from "../../core/manifest/index.js"

export type ViteBuildOutput = Awaited<ReturnType<ViteBuilder["build"]>>
export interface ViteAppBuildPreparation {
  readonly builder: ViteBuilder
  readonly render: BuildEnvironment
  readonly client: BuildEnvironment
  readonly renderOutput: ViteBuildOutput
}
export interface ViteAppBuildOptions {
  readonly renderName?: string
  readonly clientName?: string
  readonly prepareClient?: (
    preparation: ViteAppBuildPreparation,
  ) => void | Promise<void>
}
export interface ViteAppBuildResult {
  readonly schemaVersion: "1"
  readonly status: "success"
  readonly buildId?: string
  readonly diagnostics: readonly import("../../core/diagnostics/index.js").Diagnostic[]
  readonly environments: Readonly<{
    render: Readonly<{ name: string; status: "built" }>
    client: Readonly<{ name: string; status: "built" }>
  }>
  readonly outputManifest: OutputManifest
}
export declare class ViteAppEnvironmentNotFoundError extends Error {
  readonly code: "MINISTA_VITE_APP_ENVIRONMENT_NOT_FOUND"
  constructor(environmentName: string)
}
export declare class ViteAppBuilderAdapter {
  constructor(
    factory?: (
      config: InlineConfig,
      useLegacyBuilder: false,
    ) => Promise<ViteBuilder>,
  )
  build(
    config: InlineConfig,
    options?: ViteAppBuildOptions,
  ): Promise<ViteAppBuildResult>
}
