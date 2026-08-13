import type { DiagnosticsReport } from "../../core/diagnostics/index.js"

export declare class NodeDiagnosticsWriter {
  write(root: string, report: DiagnosticsReport): Promise<string>
}
