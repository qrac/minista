import type {
  ArchiveBuilder,
  ArchiveOptions,
} from "../../features/archive/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"

export type NodeArchiveErrorCode =
  | "MINISTA_ARCHIVE_FAILED"
  | "MINISTA_ARCHIVE_SOURCE_NOT_FOUND"
  | "MINISTA_ARCHIVE_SOURCE_NOT_DIRECTORY"

export declare class NodeArchiveError extends Error {
  readonly code: NodeArchiveErrorCode
  readonly format: "zip" | "tar"
  readonly sourceDirectory: string
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: ArchiveOptions, code?: NodeArchiveErrorCode)
}

export declare class NodeArchiveBuilder implements ArchiveBuilder {
  constructor(rootDir: string, excludedPaths?: readonly string[])
  build(options: ArchiveOptions): Promise<Uint8Array>
  write(options: ArchiveOptions, target: string): Promise<void>
}

export declare class NodeArchivePublisher {
  constructor(rootDir: string, directory: string, excludedPaths?: readonly string[])
  publish(options: ArchiveOptions, fileName: string): Promise<void>
}
