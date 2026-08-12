import type { DiagnosticSummary } from "../diagnostics/index.js"
import type { ProjectGraphSnapshot } from "../graph/index.js"
import type { ProjectManifest } from "./types.js"
export interface CreateManifestOptions {
  readonly version: string
  readonly createdAt: string
  readonly diagnostics: DiagnosticSummary
}
export declare function createProjectManifest(graph: ProjectGraphSnapshot, options: CreateManifestOptions): ProjectManifest
