import type { EmittedFile } from "../../core/artifacts/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

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
export declare function processViteOutputs(
  files: readonly EmittedFile[],
  features: readonly MinistaFeature[],
): Promise<readonly EmittedFile[]>
