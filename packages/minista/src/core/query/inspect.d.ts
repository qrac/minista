import type { ProjectGraphSnapshot } from "../graph/index.js"
import type { ProjectManifest } from "../manifest/index.js"
import type { ProjectInspection } from "./types.js"
export declare function inspectProject(graph: ProjectGraphSnapshot): ProjectInspection
export declare function inspectProjectManifest(manifest: ProjectManifest): ProjectInspection
