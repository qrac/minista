import type { ArtifactRecord, ArtifactStore, EmittedFile, Emitter } from "./types.js"
import type { ArtifactId } from "../graph/index.js"
export declare class ArtifactConflictError extends Error {
  readonly code = "MINISTA_ARTIFACT_CONFLICT"
  constructor(id: ArtifactId)
}
export declare class MemoryArtifactStore implements ArtifactStore {
  #private
  put(record: ArtifactRecord): Promise<void>
  get(id: ArtifactId): Promise<ArtifactRecord | undefined>
  has(id: ArtifactId): Promise<boolean>
  list(): Promise<readonly ArtifactRecord[]>
  delete(id: ArtifactId): Promise<boolean>
  clear(): Promise<void>
}
export declare class MemoryEmitter implements Emitter {
  #private
  emit(file: EmittedFile): Promise<void>
  list(): Promise<readonly EmittedFile[]>
}
