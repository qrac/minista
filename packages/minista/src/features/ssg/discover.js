// @ts-check

import { discoverRoutes } from "./route.js"

/** @typedef {import("../../core/diagnostics/index.js").DiagnosticCollector} DiagnosticCollector */
/** @typedef {import("../../core/graph/index.js").ProjectGraph} ProjectGraph */
/** @typedef {import("./types.js").SsgDiscoveryOptions} SsgDiscoveryOptions */

/**
 * @param {ProjectGraph} graph
 * @param {DiagnosticCollector} diagnostics
 * @param {readonly string[]} sourceFiles
 * @param {SsgDiscoveryOptions} options
 */
export function addDiscoveredRoutes(graph, diagnostics, sourceFiles, options) {
  for (const { route } of discoverRoutes(sourceFiles, options)) {
    graph.addRoute(route)
  }
  if (sourceFiles.length === 0) {
    diagnostics.warning({
      code: "MINISTA_ROUTE_NONE",
      message: "No page source matched the configured SSG patterns.",
      hint: "Check pluginSsg().src and the project root.",
      phase: "discover",
      feature: "feature:ssg",
    })
  }
}
