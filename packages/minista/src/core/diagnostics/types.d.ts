import type { BuildPhase, ProjectPath } from "../types.js"
export type DiagnosticCode = `MINISTA_${string}`
export type DiagnosticSeverity = "error" | "warning" | "info"
export interface DiagnosticLocation {
  readonly file: ProjectPath
  readonly line?: number
  readonly column?: number
  readonly endLine?: number
  readonly endColumn?: number
}
export interface DiagnosticRelatedLocation {
  readonly message: string
  readonly location: DiagnosticLocation
}
export interface Diagnostic {
  readonly code: DiagnosticCode
  readonly severity: DiagnosticSeverity
  readonly message: string
  readonly hint?: string
  readonly location?: DiagnosticLocation
  readonly phase?: BuildPhase
  readonly feature?: string
  readonly nodeId?: string
  readonly related?: readonly DiagnosticRelatedLocation[]
  readonly docsUrl?: string
}
export interface DiagnosticSummary {
  readonly errors: number
  readonly warnings: number
  readonly info: number
}
