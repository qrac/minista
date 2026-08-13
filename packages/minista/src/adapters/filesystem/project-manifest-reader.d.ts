import type { ProjectManifest } from "../../core/manifest/index.js"

export declare class ProjectManifestNotFoundError extends Error {
  readonly code: "MINISTA_MANIFEST_NOT_FOUND"
  constructor()
}
export declare class NodeProjectManifestReader {
  read(root: string): Promise<ProjectManifest>
}
