import type {
  ArtifactContent,
  ArtifactRecord,
  ArtifactStore,
  EmittedFile,
  Emitter,
} from "./types.js"
import type { ArtifactId } from "../graph/index.js"

function copyContent(content: ArtifactContent): ArtifactContent {
  return typeof content === "string" ? content : content.slice()
}

function sameContent(left: ArtifactContent, right: ArtifactContent): boolean {
  if (typeof left === "string" || typeof right === "string") {
    return typeof left === "string" && left === right
  }
  return (
    left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index])
  )
}

export class ArtifactConflictError extends Error {
  readonly code = "MINISTA_ARTIFACT_CONFLICT"

  constructor(id: ArtifactId) {
    super(`Artifact ${id} was written with different content.`)
    this.name = "ArtifactConflictError"
  }
}

export class MemoryArtifactStore implements ArtifactStore {
  readonly #records = new Map<ArtifactId, ArtifactRecord>()

  async put(record: ArtifactRecord): Promise<void> {
    const current = this.#records.get(record.id)
    if (current && !sameContent(current.content, record.content)) {
      throw new ArtifactConflictError(record.id)
    }
    this.#records.set(
      record.id,
      Object.freeze({ ...record, content: copyContent(record.content) }),
    )
  }

  async get(id: ArtifactId): Promise<ArtifactRecord | undefined> {
    const record = this.#records.get(id)
    return record
      ? Object.freeze({ ...record, content: copyContent(record.content) })
      : undefined
  }

  async has(id: ArtifactId): Promise<boolean> {
    return this.#records.has(id)
  }

  async list(): Promise<readonly ArtifactRecord[]> {
    return Object.freeze(
      [...this.#records.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((record) =>
          Object.freeze({ ...record, content: copyContent(record.content) }),
        ),
    )
  }

  async delete(id: ArtifactId): Promise<boolean> {
    return this.#records.delete(id)
  }

  async clear(): Promise<void> {
    this.#records.clear()
  }
}

export class MemoryEmitter implements Emitter {
  readonly #files = new Map<string, EmittedFile>()

  async emit(file: EmittedFile): Promise<void> {
    if (this.#files.has(file.fileName)) {
      throw new Error(`Output ${file.fileName} is already emitted.`)
    }
    this.#files.set(
      file.fileName,
      Object.freeze({ ...file, content: copyContent(file.content) }),
    )
  }

  async list(): Promise<readonly EmittedFile[]> {
    return Object.freeze(
      [...this.#files.values()]
        .sort((left, right) => left.fileName.localeCompare(right.fileName))
        .map((file) =>
          Object.freeze({ ...file, content: copyContent(file.content) }),
        ),
    )
  }
}
