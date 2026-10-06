import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import type { ProjectGraph } from "../../core/graph/index.js"
import type { SsgDiscoveryOptions } from "./types.js"
export declare function addDiscoveredRoutes(graph: ProjectGraph, diagnostics: DiagnosticCollector, sourceFiles: readonly string[], options: SsgDiscoveryOptions): void
