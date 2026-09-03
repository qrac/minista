// @ts-check

/** @param {import("../../core/diagnostics/index.js").Diagnostic} diagnostic */
export function reportCliDiagnostic(diagnostic) {
  const stream = diagnostic.severity === "error" ? console.error : console.warn
  stream(`[${diagnostic.code}] ${diagnostic.message}`)
  if (diagnostic.hint) stream(`  hint: ${diagnostic.hint}`)
}

/** @param {unknown} error */
export function reportCliError(error) {
  const diagnostic = error && typeof error === "object"
    ? Reflect.get(error, "diagnostic")
    : undefined
  if (diagnostic) reportCliDiagnostic(diagnostic)
  else console.error(error)
}

/**
 * @param {readonly string[]} configFiles
 * @returns {import("../../core/diagnostics/index.js").Diagnostic}
 */
export function createConfigConflictDiagnostic(configFiles) {
  const fileList = configFiles.map((fileName) => `  ${fileName}`).join("\n")
  return Object.freeze({
    code: "MINISTA_CLI_CONFIG_CONFLICT",
    severity: "error",
    message: `Error: Multiple config files were found.\n\n${fileList}\n\nPlease remove one of them. \`vite.config.js\` is recommended.`,
  })
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
