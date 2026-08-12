import type { ArtifactStore } from "../../core/artifacts/index.js"
import type { InlineConfig } from "vite"

export interface ViteBuildSession {
  readonly artifacts: ArtifactStore
}
export declare const MINISTA_BUILD_SESSION_KEY: "__ministaBuildSession"
export declare function attachViteBuildSession(
  config: InlineConfig,
  session: ViteBuildSession,
): InlineConfig
export declare function getViteBuildSession(
  config: unknown,
): ViteBuildSession | undefined
