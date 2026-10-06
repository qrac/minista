import type {
  ImportedPages,
  PluginOptions,
} from "../../plugins/ssg/types.js"
import type { LegacySsgProjectResult } from "./legacy-ssg-project.js"

export declare class LegacySsgRouteCache {
  invalidate(sourceFiles: Iterable<string>): void
  clear(): void
  resolve(
    importedPages: ImportedPages,
    options: Pick<PluginOptions, "srcBases">,
  ): Promise<LegacySsgProjectResult>
}
