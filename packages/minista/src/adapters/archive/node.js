// @ts-check

import { TarArchive, ZipArchive } from "archiver"

/** @typedef {import("../../features/archive/index.js").ArchiveOptions} ArchiveOptions */

export class NodeArchiveError extends Error {
  code = "MINISTA_ARCHIVE_FAILED"

  /** @param {unknown} cause @param {ArchiveOptions} options */
  constructor(cause, options) {
    const format = options.format ?? "zip"
    const detail = cause instanceof Error ? cause.message : String(cause)
    const message = `Failed to create ${format} archive ${options.outName} from ${options.srcDir}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeArchiveError"
    this.format = format
    this.sourceDirectory = options.srcDir
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      hint: "Check the archive source directory, ignore patterns, and format options.",
      phase: "finalize",
      feature: "feature:archive",
    })
  }
}

export class NodeArchiveBuilder {
  #rootDir

  /** @param {string} rootDir */
  constructor(rootDir) {
    this.#rootDir = rootDir
  }

  /** @param {ArchiveOptions} options */
  async build(options) {
    try {
      return await new Promise((resolve, reject) => {
        const archive =
          options.format === "tar"
            ? new TarArchive(options.options)
            : new ZipArchive(options.options ?? { zlib: { level: 9 } })
        /** @type {Buffer[]} */
        const chunks = []

        archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
        archive.on("error", reject)
        archive.on("warning", (error) => {
          if (error.code !== "ENOENT") reject(error)
        })
        archive.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))))
        const ignore =
          typeof options.ignore === "string"
            ? options.ignore
            : options.ignore
              ? [...options.ignore]
              : undefined
        archive.glob(`${options.srcDir.replaceAll("\\", "/")}/**/*`, {
          cwd: this.#rootDir,
          ignore,
        })
        void archive.finalize().catch(reject)
      })
    } catch (error) {
      if (
        error instanceof Error &&
        typeof Reflect.get(error, "code") === "string" &&
        Reflect.get(error, "code").startsWith("MINISTA_")
      ) {
        throw error
      }
      throw new NodeArchiveError(error, options)
    }
  }
}
