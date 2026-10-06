import type { ArtifactId, FeatureId, PageId } from "../graph/index.js"
export type ArtifactContent = string | Uint8Array
export type ArtifactScope =
  | { readonly kind: "build" }
  | { readonly kind: "page", readonly pageId: PageId }
export interface ArtifactRecord {
  readonly schemaVersion: "1"
  readonly id: ArtifactId
  readonly owner: FeatureId
  readonly mediaType: string
  readonly content: ArtifactContent
  readonly contentHash?: string
  readonly scope?: ArtifactScope
}
export interface ArtifactStore {
  put(record: ArtifactRecord): Promise<void>
  get(id: ArtifactId): Promise<ArtifactRecord | undefined>
  has(id: ArtifactId): Promise<boolean>
  list(): Promise<readonly ArtifactRecord[]>
  delete(id: ArtifactId): Promise<boolean>
  clear(): Promise<void>
}
export interface EmittedFile {
  readonly fileName: string
  readonly content: ArtifactContent
  readonly mediaType?: string
}
export interface Emitter {
  emit(file: EmittedFile): Promise<void>
  replace(file: EmittedFile): Promise<void>
  list(): Promise<readonly EmittedFile[]>
}
