import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { ProjectGraphSnapshot } from "../../core/graph/index.js"
import type { PageNode, RouteNode } from "../../core/graph/index.js"
import type {
  ImportedPages,
  PluginOptions,
  ResolvedPage,
} from "../../plugins/ssg/types.js"

export interface LegacySsgProjectResult {
  readonly graph: ProjectGraphSnapshot
  readonly pages: readonly ResolvedPage[]
  readonly diagnostics: readonly Diagnostic[]
}
export interface LegacySsgRouteEntry {
  readonly sourceFile: string
  readonly route: RouteNode
  readonly pageNodes: readonly PageNode[]
  readonly pages: readonly ResolvedPage[]
  readonly diagnostics: readonly Diagnostic[]
}

export declare function resolveLegacySsgRoute(
  sourceFile: string,
  pageModule: ImportedPages[string],
  options: Pick<PluginOptions, "srcBases">,
): Promise<LegacySsgRouteEntry>
export declare function createLegacySsgProject(
  entries: readonly LegacySsgRouteEntry[],
  projectName?: string,
): LegacySsgProjectResult

export declare function resolveLegacySsgProject(
  importedPages: ImportedPages,
  options: Pick<PluginOptions, "srcBases">,
  projectName?: string,
): Promise<LegacySsgProjectResult>
