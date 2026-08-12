import type { Diagnostic } from "../../core/diagnostics/index.js"
import type { ProjectGraphSnapshot } from "../../core/graph/index.js"
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

export declare function resolveLegacySsgProject(
  importedPages: ImportedPages,
  options: Pick<PluginOptions, "srcBases">,
): Promise<LegacySsgProjectResult>
