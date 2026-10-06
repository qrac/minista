// @ts-check

import { serializeDiagnosticsReport } from "../../core/diagnostics/index.js"
import { NodeAtomicWorkspaceWriter } from "./atomic-workspace-writer.js"

export class NodeDiagnosticsWriter {
  #writer = new NodeAtomicWorkspaceWriter()

  /**
   * @param {string} root
   * @param {import("../../core/diagnostics/index.js").DiagnosticsReport} report
   */
  async write(root, report) {
    return this.#writer.write(
      root,
      "diagnostics.json",
      serializeDiagnosticsReport(report),
    )
  }
}
