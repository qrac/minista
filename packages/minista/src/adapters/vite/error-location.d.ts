import type { DiagnosticLocation } from "../../core/diagnostics/index.js"

export declare function getViteErrorLocation(
  error: unknown,
  root: string,
): DiagnosticLocation | undefined
