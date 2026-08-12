import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { CommandName, CommandResult } from "./types.js"

export function createCommandResult<Data>(
  command: CommandName,
  data: Data,
  diagnostics: DiagnosticCollector,
): CommandResult<Data> {
  return Object.freeze({
    schemaVersion: "1",
    command,
    ok: !diagnostics.hasErrors(),
    data,
    diagnostics: diagnostics.snapshot(),
  })
}
