import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import type { ProjectGraph } from "../../core/graph/index.js"
import { discoverRoutes } from "./route.js"
import type { SsgDiscoveryOptions } from "./types.js"

export function addDiscoveredRoutes(
  graph: ProjectGraph,
  diagnostics: DiagnosticCollector,
  sourceFiles: readonly string[],
  options: SsgDiscoveryOptions,
): void {
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
