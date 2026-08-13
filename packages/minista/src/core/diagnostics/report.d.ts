import type { Diagnostic, DiagnosticSummary } from "./types.js"

export interface DiagnosticsReport {
  readonly schemaVersion: "1"
  readonly generator: {
    readonly name: "minista"
    readonly version: string
  }
  readonly command: "build" | "check"
  readonly buildId?: string
  readonly summary: DiagnosticSummary
  readonly diagnostics: readonly Diagnostic[]
  readonly createdAt: string
}
export interface CreateDiagnosticsReportOptions {
  readonly version: string
  readonly command: DiagnosticsReport["command"]
  readonly buildId?: string
  readonly diagnostics: readonly Diagnostic[]
  readonly createdAt: string
}
export declare function createDiagnosticsReport(
  options: CreateDiagnosticsReportOptions,
): DiagnosticsReport
export declare function serializeDiagnosticsReport(
  report: DiagnosticsReport,
): string
