import type { Diagnostic, DiagnosticCode } from "../../core/diagnostics/index.js"

export declare class SearchIndexError extends Error {
  readonly code: DiagnosticCode
  readonly diagnostic: Diagnostic
  constructor(code: DiagnosticCode, message: string)
}
export declare function resolveSearchIndex<T extends { name?: string | null }>(
  indexes: readonly T[], name: string | undefined, multiIndex: boolean,
): T
