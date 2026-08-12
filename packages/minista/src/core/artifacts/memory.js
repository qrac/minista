// @ts-check

/** @typedef {import("./types.js").ArtifactContent} ArtifactContent */
/** @typedef {import("./types.js").ArtifactRecord} ArtifactRecord */
/** @typedef {import("./types.js").EmittedFile} EmittedFile */
/** @typedef {import("../graph/index.js").ArtifactId} ArtifactId */

/** @param {ArtifactContent} content */
function copyContent(content) {
  return typeof content === "string" ? content : content.slice()
}
/**
 * @param {ArtifactContent} left
 * @param {ArtifactContent} right
 */
function sameContent(left, right) {
  if (typeof left === "string" || typeof right === "string") {
    return typeof left === "string" && left === right
  }
  return (left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index]))
}
export class ArtifactConflictError extends Error {
  code = "MINISTA_ARTIFACT_CONFLICT"
  /** @param {ArtifactId} id */
  constructor(id) {
    super(`Artifact ${id} was written with different content.`)
    this.name = "ArtifactConflictError"
  }
}
export class MemoryArtifactStore {
  /** @type {Map<ArtifactId, Readonly<ArtifactRecord>>} */
  #records = new Map()
  /** @param {ArtifactRecord} record */
  async put(record) {
    const current = this.#records.get(record.id)
    if (current && !sameContent(current.content, record.content)) {
      throw new ArtifactConflictError(record.id)
    }
    this.#records.set(record.id, Object.freeze({ ...record, content: copyContent(record.content) }))
  }
  /** @param {ArtifactId} id */
  async get(id) {
    const record = this.#records.get(id)
    return record
      ? Object.freeze({ ...record, content: copyContent(record.content) })
      : undefined
  }
  /** @param {ArtifactId} id */
  async has(id) {
    return this.#records.has(id)
  }
  async list() {
    return Object.freeze([...this.#records.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((record) => Object.freeze({ ...record, content: copyContent(record.content) })))
  }
  /** @param {ArtifactId} id */
  async delete(id) {
    return this.#records.delete(id)
  }
  async clear() {
    this.#records.clear()
  }
}
export class MemoryEmitter {
  /** @type {Map<string, Readonly<EmittedFile>>} */
  #files = new Map()
  /** @param {EmittedFile} file */
  async emit(file) {
    if (this.#files.has(file.fileName)) {
      throw new Error(`Output ${file.fileName} is already emitted.`)
    }
    this.#files.set(file.fileName, Object.freeze({ ...file, content: copyContent(file.content) }))
  }
  async list() {
    return Object.freeze([...this.#files.values()]
      .sort((left, right) => left.fileName.localeCompare(right.fileName))
      .map((file) => Object.freeze({ ...file, content: copyContent(file.content) })))
  }
}
