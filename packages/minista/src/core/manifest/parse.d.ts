import type { ProjectManifest } from "./types.js"

export declare class ProjectManifestInvalidError extends Error {
  readonly code: "MINISTA_MANIFEST_INVALID"
  constructor(message: string)
}
export declare class ProjectManifestVersionUnsupportedError extends Error {
  readonly code: "MINISTA_MANIFEST_VERSION_UNSUPPORTED"
  constructor(version: unknown)
}
export declare function parseProjectManifest(value: unknown): ProjectManifest
