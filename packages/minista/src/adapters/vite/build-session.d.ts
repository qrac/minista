import type { ArtifactStore } from "../../core/artifacts/index.js"
import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import type { InlineConfig } from "vite"
import type { ProjectGraphSnapshot } from "../../core/graph/index.js"
import type { HtmlDocumentStore } from "../../core/document/index.js"
import type { PageId } from "../../core/graph/index.js"
import type { PhaseTraceEvent } from "../../core/lifecycle/index.js"

export interface ViteCompatibilityTraceEvent extends PhaseTraceEvent {
  readonly scope: string
}

export interface ViteBuildSessionState {
  projectGraph?: ProjectGraphSnapshot
  compatibilityTraces?: ViteCompatibilityTraceEvent[]
  compatibilityDocuments?: HtmlDocumentStore
  compatibilityDocumentIds?: Map<string, PageId>
}

export interface ViteBuildSession {
  readonly buildId?: string
  readonly artifacts: ArtifactStore
  readonly diagnostics?: DiagnosticCollector
  readonly state?: ViteBuildSessionState
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
