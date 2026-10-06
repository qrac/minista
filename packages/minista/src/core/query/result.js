// @ts-check

/** @typedef {import("../diagnostics/index.js").DiagnosticCollector} DiagnosticCollector */
/** @typedef {import("./types.js").CommandName} CommandName */

/**
 * @template Data
 * @param {CommandName} command
 * @param {Data} data
 * @param {DiagnosticCollector} diagnostics
 * @returns {import("./types.js").CommandResult<Data>}
 */
export function createCommandResult(command, data, diagnostics) {
  return Object.freeze({
    schemaVersion: "1",
    command,
    ok: !diagnostics.hasErrors(),
    data,
    diagnostics: diagnostics.snapshot(),
  })
}
