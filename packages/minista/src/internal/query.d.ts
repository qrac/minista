import type {
  ProjectManifest,
  ProjectManifestMigration,
} from "../core/manifest/index.js"
import type {
  ProjectInspection,
  ProjectPageTrace,
} from "../core/query/index.js"

export type ProjectQueryRequest =
  | { readonly kind: "inspect" }
  | { readonly kind: "trace-page"; readonly target: string }
export type ProjectQueryResult = ProjectInspection | ProjectPageTrace

export declare class ProjectQueryRequestInvalidError extends Error {
  readonly code: "MINISTA_QUERY_REQUEST_INVALID"
  constructor(message: string)
}

export declare function queryProjectManifest(
  manifest: ProjectManifest,
  request: ProjectQueryRequest,
): ProjectQueryResult
export declare function queryProject(
  root: string,
  request: ProjectQueryRequest,
  options?: { readonly migrations?: readonly ProjectManifestMigration[] },
): Promise<ProjectQueryResult>

export {
  ProjectManifestInvalidError,
  ProjectManifestVersionUnsupportedError,
} from "../core/manifest/index.js"
export { ProjectManifestNotFoundError } from "../adapters/filesystem/project-manifest-reader.js"
