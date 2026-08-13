import type { ProjectManifest } from "../../core/manifest/index.js"

export declare class NodeExternalBuildHandoff {
  write(root: string, buildId: string, manifest: ProjectManifest): Promise<string>
  read(root: string, buildId: string): Promise<ProjectManifest | undefined>
  clear(root: string, buildId: string): Promise<void>
}
