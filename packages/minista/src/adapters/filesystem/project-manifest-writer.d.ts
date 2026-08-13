import type { ProjectManifest } from "../../core/manifest/index.js"

export declare class NodeProjectManifestWriter {
  write(root: string, manifest: ProjectManifest): Promise<string>
}
