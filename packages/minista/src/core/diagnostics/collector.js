// @ts-check

/** @typedef {import("./types.js").Diagnostic} Diagnostic */
/** @typedef {import("./types.js").DiagnosticCode} DiagnosticCode */
/** @typedef {import("./types.js").DiagnosticSeverity} DiagnosticSeverity */
/** @typedef {import("./types.js").DiagnosticSummary} DiagnosticSummary */
/** @typedef {Omit<Diagnostic, "severity">} DiagnosticInput */

export class DiagnosticCollector {
  /** @type {Diagnostic[]} */
  #items = []
  /** @param {Diagnostic} diagnostic */
  add(diagnostic) {
    const item = Object.freeze({ ...diagnostic })
    this.#items.push(item)
    return item
  }
  /** @param {DiagnosticInput} input */
  error(input) {
    return this.add({ ...input, severity: "error" })
  }
  /** @param {DiagnosticInput} input */
  warning(input) {
    return this.add({ ...input, severity: "warning" })
  }
  /** @param {DiagnosticInput} input */
  info(input) {
    return this.add({ ...input, severity: "info" })
  }
  hasErrors() {
    return this.#items.some(({ severity }) => severity === "error")
  }
  /** @param {DiagnosticCode} code */
  byCode(code) {
    return Object.freeze(this.#items.filter((item) => item.code === code))
  }
  /** @param {DiagnosticSeverity} severity */
  bySeverity(severity) {
    return Object.freeze(this.#items.filter((item) => item.severity === severity))
  }
  /** @returns {DiagnosticSummary} */
  summary() {
    return Object.freeze({
      errors: this.bySeverity("error").length,
      warnings: this.bySeverity("warning").length,
      info: this.bySeverity("info").length,
    })
  }
  snapshot() {
    return Object.freeze([...this.#items])
  }
  clear() {
    this.#items.length = 0
  }
}
