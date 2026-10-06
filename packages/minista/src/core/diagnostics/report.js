// @ts-check

import { serializeStableJson } from "../serialization/index.js"

/**
 * @param {import("./report.js").CreateDiagnosticsReportOptions} options
 * @returns {import("./report.js").DiagnosticsReport}
 */
export function createDiagnosticsReport(options) {
  const diagnostics = Object.freeze(options.diagnostics.map(
    (diagnostic) => Object.freeze({ ...diagnostic }),
  ))
  return Object.freeze({
    schemaVersion: "1",
    generator: Object.freeze({ name: "minista", version: options.version }),
    command: options.command,
    ...(options.buildId ? { buildId: options.buildId } : {}),
    summary: Object.freeze({
      errors: diagnostics.filter(({ severity }) => severity === "error").length,
      warnings: diagnostics.filter(({ severity }) => severity === "warning").length,
      info: diagnostics.filter(({ severity }) => severity === "info").length,
    }),
    diagnostics,
    createdAt: options.createdAt,
  })
}

/** @param {import("./report.js").DiagnosticsReport} report */
export function serializeDiagnosticsReport(report) {
  return serializeStableJson(report)
}
