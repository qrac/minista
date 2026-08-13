import type { OutputFile, OutputManifest } from "./types.js"

export declare class OutputFileConflictError extends Error {
  readonly code: "MINISTA_OUTPUT_FILE_CONFLICT"
  constructor(fileName: string)
}
export declare function createOutputManifest(
  environment: string,
  files: readonly OutputFile[],
): OutputManifest
