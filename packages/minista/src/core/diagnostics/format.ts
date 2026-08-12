import type { Diagnostic } from "./types.js"

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.location
    ? `${diagnostic.location.file}${diagnostic.location.line ? `:${diagnostic.location.line}` : ""}${diagnostic.location.column ? `:${diagnostic.location.column}` : ""}`
    : ""
  const source = [diagnostic.phase, diagnostic.feature, location]
    .filter(Boolean)
    .join(" ")
  const prefix = `[${diagnostic.code}]${source ? ` ${source}` : ""}`
  const hint = diagnostic.hint ? `\n  hint: ${diagnostic.hint}` : ""

  return `${prefix} ${diagnostic.message}${hint}`
}
