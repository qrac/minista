import type {
  ArchiveBuilder,
  ArchiveOptions,
} from "../../features/archive/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"

export declare class NodeArchiveError extends Error {
  readonly code: "MINISTA_ARCHIVE_FAILED"
  readonly format: "zip" | "tar"
  readonly sourceDirectory: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: ArchiveOptions)
}

export declare class NodeArchiveBuilder implements ArchiveBuilder {
  constructor(rootDir: string)
  build(options: ArchiveOptions): Promise<Uint8Array>
}
