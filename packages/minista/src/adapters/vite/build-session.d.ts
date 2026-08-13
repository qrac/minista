import type { ArtifactStore } from "../../core/artifacts/index.js"
import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import type { InlineConfig } from "vite"

export interface ViteBuildSession {
  readonly buildId?: string
  readonly artifacts: ArtifactStore
  readonly diagnostics?: DiagnosticCollector
}
export declare const MINISTA_BUILD_SESSION_KEY: "__ministaBuildSession"
export declare function createViteBuildSession(options?: {
  readonly buildId?: string
  readonly artifacts?: ArtifactStore
  readonly diagnostics?: DiagnosticCollector
}): Required<ViteBuildSession>
export declare function disposeViteBuildSession(
  session: ViteBuildSession,
): Promise<void>
export declare function attachViteBuildSession(
  config: InlineConfig,
  session: ViteBuildSession,
): InlineConfig
export declare function getViteBuildSession(
  config: unknown,
): ViteBuildSession | undefined
