import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  DiagnosticSummary,
} from "./types.js"

type DiagnosticInput = Omit<Diagnostic, "severity">

export class DiagnosticCollector {
  readonly #items: Diagnostic[] = []

  add(diagnostic: Diagnostic): Diagnostic {
    const item = Object.freeze({ ...diagnostic })
    this.#items.push(item)
    return item
  }

  error(input: DiagnosticInput): Diagnostic {
    return this.add({ ...input, severity: "error" })
  }

  warning(input: DiagnosticInput): Diagnostic {
    return this.add({ ...input, severity: "warning" })
  }

  info(input: DiagnosticInput): Diagnostic {
    return this.add({ ...input, severity: "info" })
  }

  hasErrors(): boolean {
    return this.#items.some(({ severity }) => severity === "error")
  }

  byCode(code: DiagnosticCode): readonly Diagnostic[] {
    return Object.freeze(this.#items.filter((item) => item.code === code))
  }

  bySeverity(severity: DiagnosticSeverity): readonly Diagnostic[] {
    return Object.freeze(
      this.#items.filter((item) => item.severity === severity),
    )
  }

  summary(): DiagnosticSummary {
    return Object.freeze({
      errors: this.bySeverity("error").length,
      warnings: this.bySeverity("warning").length,
      info: this.bySeverity("info").length,
    })
  }

  snapshot(): readonly Diagnostic[] {
    return Object.freeze([...this.#items])
  }

  clear(): void {
    this.#items.length = 0
  }
}
