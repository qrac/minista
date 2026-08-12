import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { CommandName, CommandResult } from "./types.js"
export declare function createCommandResult<Data>(command: CommandName, data: Data, diagnostics: DiagnosticCollector): CommandResult<Data>
