// @ts-check

/** @param {import("../../core/diagnostics/index.js").Diagnostic} diagnostic */
export function reportCliDiagnostic(diagnostic) {
  const stream = diagnostic.severity === "error" ? console.error : console.warn
  stream(`[${diagnostic.code}] ${diagnostic.message}`)
  if (diagnostic.hint) stream(`  hint: ${diagnostic.hint}`)
}

/** @returns {import("../../core/diagnostics/index.js").Diagnostic} */
export function createOneBuildDeprecationDiagnostic() {
  return Object.freeze({
    code: "MINISTA_CLI_ONE_BUILD_DEPRECATED",
    severity: "warning",
    message: "The --oneBuild option is deprecated and will be removed in the next major version.",
    hint: "Remove --oneBuild. The default minista build already uses one App Build lifecycle.",
  })
}
