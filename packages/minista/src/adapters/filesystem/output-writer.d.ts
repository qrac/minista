import type { EmittedFile } from "../../core/artifacts/index.js"

export declare class OutputWriteUnsafePathError extends Error {
  readonly code: "MINISTA_OUTPUT_WRITE_UNSAFE_PATH"
  constructor(fileName: string)
}
export declare class NodeOutputWriter {
  write(directory: string, files: readonly EmittedFile[]): Promise<readonly string[]>
}
