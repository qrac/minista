import type {
  ProjectManifest,
  ProjectManifestMigration,
} from "../../core/manifest/index.js"

export declare class ProjectManifestNotFoundError extends Error {
  readonly code: "MINISTA_MANIFEST_NOT_FOUND"
  constructor()
}
export declare class NodeProjectManifestReader {
  constructor(migrations?: readonly ProjectManifestMigration[])
  read(root: string): Promise<ProjectManifest>
}
