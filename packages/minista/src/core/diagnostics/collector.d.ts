import type { Diagnostic, DiagnosticCode, DiagnosticSeverity, DiagnosticSummary } from "./types.js"
type DiagnosticInput = Omit<Diagnostic, "severity">
export declare class DiagnosticCollector {
  #private
  add(diagnostic: Diagnostic): Diagnostic
  error(input: DiagnosticInput): Diagnostic
  warning(input: DiagnosticInput): Diagnostic
  info(input: DiagnosticInput): Diagnostic
  hasErrors(): boolean
  byCode(code: DiagnosticCode): readonly Diagnostic[]
  bySeverity(severity: DiagnosticSeverity): readonly Diagnostic[]
  summary(): DiagnosticSummary
  snapshot(): readonly Diagnostic[]
  clear(): void
}
export {}
