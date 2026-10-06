// @ts-check

import fs from "node:fs/promises"
import path from "node:path"
import { createWriteStream } from "node:fs"
import { randomUUID } from "node:crypto"
import { pipeline } from "node:stream/promises"
import { OutputWriteUnsafePathError } from "../filesystem/output-writer.js"

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
    return this.#build(options)
  }

  /** @param {ArchiveOptions} options @param {string} target */
  async write(options, target) {
    await this.#build(options, target)
  }

  /** @param {ArchiveOptions} options @param {string} [target] */
  async #build(options, target) {
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

        const fail = (/** @type {Error} */ error) => {
          try { archive.abort() } catch { /* Preserve the original failure before TAR initialization. */ }
          archive.destroy(error)
          reject(error)
        }
        archive.on("error", reject)
        archive.on("warning", fail)
        /** @type {Promise<void> | undefined} */
        let completion
        if (target) {
          // pipeline settles only after the destination closes, including errors.
          const destination = createWriteStream(target, { flags: "wx" })
          archive.removeListener("error", reject)
          archive.removeListener("warning", fail)
          archive.on("warning", (error) => archive.destroy(error))
          completion = pipeline(archive, destination).then(() => resolve(new Uint8Array()), (error) => {
            try { archive.abort() } catch { /* TAR may not have initialized its engine yet. */ }
            reject(error)
          })
        } else {
          archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
          archive.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))))
        }
        const ignore = typeof options.ignore === "string"
          ? [options.ignore] : [...options.ignore ?? []]
        ignore.push(...[...this.#excludedPaths, ...(target ? [target] : [])].map((file) =>
          escapeGlob(path.relative(cwd, file).replaceAll("\\", "/"))))
        try {
          archive.glob(sourcePattern ? `${sourcePattern}/**/*` : "**/*", {
            cwd,
            ignore,
          })
          void archive.finalize().catch((error) => archive.destroy(error))
        } catch (error) {
          archive.destroy(/** @type {Error} */ (error))
          if (!completion) fail(/** @type {Error} */ (error))
        }
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

/** File publication adapter; private staging paths never cross the feature port. */
export class NodeArchivePublisher {
  #builder
  #directory
  /** @param {string} rootDir @param {string} directory @param {readonly string[]} [excludedPaths] */
  constructor(rootDir, directory, excludedPaths = []) {
    this.#builder = new NodeArchiveBuilder(rootDir, excludedPaths)
    this.#directory = path.resolve(directory)
  }

  /** @param {ArchiveOptions} options @param {string} fileName */
  async publish(options, fileName) {
    const target = path.resolve(this.#directory, fileName)
    const relative = path.relative(this.#directory, target)
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new OutputWriteUnsafePathError(fileName)
    }
    const temporary = `${target}.minista-${randomUUID()}.tmp`
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await this.#builder.write(options, temporary)
      await fs.rename(temporary, target)
    } catch (error) {
      if (error instanceof NodeArchiveError) throw error
      throw new NodeArchiveError(error, options)
    } finally {
      try {
        await fs.rm(temporary, { force: true })
      } catch (error) {
        throw new NodeArchiveError(error, options)
      }
    }
  }
}
