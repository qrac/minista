import type { TarOptions, ZipOptions } from "archiver"
import type { FeatureId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

interface ArchiveBaseOptions {
  readonly srcDir: string
  readonly outName: string
  readonly ignore?: string | readonly string[]
}

export type ArchiveOptions =
  | (ArchiveBaseOptions & {
      readonly format?: "zip"
      readonly options?: ZipOptions
    })
  | (ArchiveBaseOptions & {
      readonly format: "tar"
      readonly options?: TarOptions
    })

export interface ArchiveFeatureOptions {
  readonly archives: readonly ArchiveOptions[]
}

export interface ArchiveBuilder {
  build(options: ArchiveOptions): Promise<Uint8Array>
}

export declare const ARCHIVE_FEATURE_ID: FeatureId

export declare function createArchiveFeature(
  options: ArchiveFeatureOptions,
  builder: ArchiveBuilder,
): MinistaFeature<ArchiveFeatureOptions>
