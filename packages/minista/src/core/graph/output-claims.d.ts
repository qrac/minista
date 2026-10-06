import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { OutputManifest } from "../manifest/index.js"
import type {
  ArtifactId,
  FeatureId,
} from "./ids.js"
import type {
  ArtifactKind,
  FeatureNode,
  ProjectGraphSnapshot,
} from "./types.js"

export interface OutputClaim {
  readonly id: ArtifactId
  readonly kind: ArtifactKind
  readonly owner: FeatureId
  readonly source: string
  readonly fileName: string
  readonly pageUrls: readonly string[]
  readonly dependencies: readonly ArtifactId[]
}
export declare function applyOutputClaims(
  graph: ProjectGraphSnapshot,
  claims: readonly OutputClaim[],
  features: readonly FeatureNode[],
  outputManifest: OutputManifest,
  diagnostics: DiagnosticCollector,
): ProjectGraphSnapshot
