// @ts-check

/** @typedef {import("./types.js").OutputFile} OutputFile */
/** @typedef {import("./types.js").OutputManifest} OutputManifest */

export class OutputFileConflictError extends Error {
  code = "MINISTA_OUTPUT_FILE_CONFLICT"

  /** @param {string} fileName */
  constructor(fileName) {
    super(`Output manifest contains duplicate file ${fileName}.`)
    this.name = "OutputFileConflictError"
  }
}

/** @param {OutputFile} file */
function freezeFile(file) {
  return Object.freeze({
    ...file,
    ...(file.imports ? { imports: Object.freeze([...file.imports]) } : {}),
    ...(file.dynamicImports
      ? { dynamicImports: Object.freeze([...file.dynamicImports]) }
      : {}),
  })
}

/**
 * Create the Vite-independent output contract consumed by Core and query APIs.
 *
 * @param {string} environment
 * @param {readonly OutputFile[]} files
 * @returns {OutputManifest}
 */
export function createOutputManifest(environment, files) {
  const names = new Set()
  const normalized = [...files]
    .sort((left, right) => left.fileName.localeCompare(right.fileName))
    .map((file) => {
      if (names.has(file.fileName)) {
        throw new OutputFileConflictError(file.fileName)
      }
      names.add(file.fileName)
      return freezeFile(file)
    })

  return Object.freeze({
    schemaVersion: "1",
    environment,
    files: Object.freeze(normalized),
  })
}
