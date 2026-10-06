import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { type PageNode, type RouteNode } from "../../core/graph/index.js"
import type { PageModule } from "./types.js"
export declare function resolvePageNodes(route: RouteNode, pageModule: PageModule, diagnostics: DiagnosticCollector): Promise<readonly PageNode[]>
