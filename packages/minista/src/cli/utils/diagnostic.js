// @ts-check

/** @param {import("../../core/diagnostics/index.js").Diagnostic} diagnostic */
export function reportCliDiagnostic(diagnostic) {
  const stream = diagnostic.severity === "error" ? console.error : console.warn
  stream(`[${diagnostic.code}] ${diagnostic.message}`)
  if (diagnostic.hint) stream(`  hint: ${diagnostic.hint}`)
}

/** @param {string} option @returns {import("../../core/diagnostics/index.js").Diagnostic} */
export function createRemovedOptionDiagnostic(option) {
  return Object.freeze({
    code: "MINISTA_CLI_OPTION_REMOVED",
    severity: "error",
    message: `The ${option} option was removed in minista v5.`,
    hint: option === "--oneBuild"
      ? "Remove --oneBuild. The default minista build uses one App Build lifecycle."
      : `Remove ${option} from the command.`,
  })
}
