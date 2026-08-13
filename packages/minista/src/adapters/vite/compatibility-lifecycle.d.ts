import type { ArtifactRecord, EmittedFile } from "../../core/artifacts/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { ProjectGraphSnapshot } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"
import type { BuildPhase } from "../../core/types.js"

export interface ViteCompatibilityDocumentInput {
  readonly fileName: string
  readonly url: string
  readonly html: string
}
export interface ViteCompatibilityDocumentOutput extends ViteCompatibilityDocumentInput {}
export interface ViteCompatibilityDocumentResult {
  readonly documents: readonly ViteCompatibilityDocumentOutput[]
  readonly artifacts: readonly ArtifactRecord[]
}
export interface ViteCompatibilityDocumentHooks {
  readonly beforeCompose?: (context: {
    readonly artifacts: readonly ArtifactRecord[]
    readonly graph: ProjectGraphSnapshot
  }) => void | Promise<void>
}

export declare class ViteCompatibilityLifecycleError extends Error {
  readonly code: "MINISTA_VITE_COMPATIBILITY_LIFECYCLE_FAILED"
  readonly diagnostics: readonly Diagnostic[]
  constructor(diagnostics: readonly Diagnostic[])
}
export declare function composeViteHtml(
  html: string,
  pageIdentity: string,
  features: readonly MinistaFeature[],
): Promise<string>
export declare function processViteDocuments(
  pages: readonly ViteCompatibilityDocumentInput[],
  features: readonly MinistaFeature[],
  phases?: readonly BuildPhase[],
  hooks?: ViteCompatibilityDocumentHooks,
): Promise<ViteCompatibilityDocumentResult>
export declare function processViteOutputs(
  files: readonly EmittedFile[],
  features: readonly MinistaFeature[],
): Promise<readonly EmittedFile[]>
