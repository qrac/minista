// @ts-check

import fs from "node:fs/promises"
import path from "node:path"

import { loadDependency } from "../dependencies/archiver.js"

/** @typedef {import("../../features/archive/index.js").ArchiveOptions} ArchiveOptions */

export class NodeArchiveError extends Error {
  /** @param {unknown} cause @param {ArchiveOptions} options @param {import("./node.js").NodeArchiveErrorCode} [code] */
  constructor(cause, options, code = "MINISTA_ARCHIVE_FAILED") {
    const format = options.format ?? "zip"
    const detail = cause instanceof Error ? cause.message : String(cause)
    const message = `Failed to create ${format} archive ${options.outName} from ${options.srcDir}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeArchiveError"
    this.code = code
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
  #excludedPaths
  #rootDir

  /** @param {string} rootDir @param {readonly string[]} [excludedPaths] */
  constructor(rootDir, excludedPaths = []) {
    this.#rootDir = path.resolve(rootDir)
    this.#excludedPaths = excludedPaths
  }

  /** @param {ArchiveOptions} options */
  async build(options) {
    try {
      const source = path.resolve(this.#rootDir, options.srcDir)
      let stats
      try {
        stats = await fs.stat(source)
      } catch (error) {
        if (error && typeof error === "object" && Reflect.get(error, "code") === "ENOENT") {
          throw new NodeArchiveError(error, options, "MINISTA_ARCHIVE_SOURCE_NOT_FOUND")
        }
        throw error
      }
      if (!stats.isDirectory()) {
        throw new NodeArchiveError(new Error("Source must be a directory."), options,
          "MINISTA_ARCHIVE_SOURCE_NOT_DIRECTORY")
      }
      const relative = path.relative(this.#rootDir, source)
      const outside = relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
      const cwd = outside ? path.dirname(source) : this.#rootDir
      const sourcePattern = escapeGlob(path.relative(cwd, source).replaceAll("\\", "/"))
      const { TarArchive, ZipArchive } = await loadDependency()
      return await new Promise((resolve, reject) => {
        const archive =
          options.format === "tar"
            ? new TarArchive(options.options)
            : new ZipArchive(options.options ?? { zlib: { level: 9 } })
        /** @type {Buffer[]} */
        const chunks = []

        archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
        archive.on("error", reject)
        archive.on("warning", reject)
        archive.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))))
        const ignore = typeof options.ignore === "string"
          ? [options.ignore] : [...options.ignore ?? []]
        ignore.push(...this.#excludedPaths.map((file) =>
          escapeGlob(path.relative(cwd, file).replaceAll("\\", "/"))))
        archive.glob(sourcePattern ? `${sourcePattern}/**/*` : "**/*", {
          cwd,
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

/** @param {string} value */
function escapeGlob(value) {
  return value.replace(/[?*\[\]{}()!+@]/g, "[$&]")
}
