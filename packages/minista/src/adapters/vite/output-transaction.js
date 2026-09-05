// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import { NodeAtomicWorkspaceWriter } from "../filesystem/atomic-workspace-writer.js"

export class ViteOutputDirectoryUnsafeError extends Error {
  code = "MINISTA_OUTPUT_TRANSACTION_UNSAFE_DIR"

  /** @param {string} outDir */
  constructor(outDir) {
    super(`Refusing to transact an unsafe Vite output directory: ${outDir}`)
    this.name = "ViteOutputDirectoryUnsafeError"
  }
}

export class ViteOutputBackupExistsError extends Error {
  code = "MINISTA_OUTPUT_TRANSACTION_BACKUP_EXISTS"

  /** @param {string} backupDir */
  constructor(backupDir) {
    super(`Vite output transaction backup already exists: ${backupDir}`)
    this.name = "ViteOutputBackupExistsError"
  }
}

/** @param {string} target */
async function exists(target) {
  try {
    await fs.promises.lstat(target)
    return true
  } catch (error) {
    if (error && typeof error === "object" && Reflect.get(error, "code") === "ENOENT") {
      return false
    }
    throw error
  }
}

export class ViteOutputTransaction {
  #outDir
  #backupDir
  #hadOutput = false
  #begun = false
  #outputRestored = false
  #root
  #preserve
  #protectMetadata
  /** @type {Map<string, string | undefined>} */
  #metadata = new Map()
  /** @type {import("../../core/diagnostics/index.js").Diagnostic | undefined} */
  cleanupDiagnostic

  /**
   * @param {{root: string, outDir: string, buildId?: string, emptyOutDir?: boolean | null, protectMetadata?: boolean}} options
   */
  constructor(options) {
    const root = path.resolve(options.root)
    const outDir = path.resolve(root, options.outDir)
    if (isAncestor(outDir, root)) {
      throw new ViteOutputDirectoryUnsafeError(outDir)
    }
    const label = (options.buildId ?? randomUUID())
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80)
    this.#root = root
    this.#preserve = options.emptyOutDir === false ||
      (options.emptyOutDir == null && !isAncestor(root, outDir))
    this.#protectMetadata = options.protectMetadata ?? false
    this.#outDir = outDir
    this.#backupDir = path.resolve(
      path.dirname(outDir),
      `.${path.basename(outDir)}.minista-${label}.backup`,
    )
  }

  get outDir() {
    return this.#outDir
  }

  get backupDir() {
    return this.#backupDir
  }

  async begin() {
    if (this.#begun) return
    const [realRoot, realOutput] = await Promise.all([
      resolvePhysicalPath(this.#root), resolvePhysicalPath(this.#outDir),
    ])
    if (isAncestor(realOutput, realRoot)) {
      throw new ViteOutputDirectoryUnsafeError(this.#outDir)
    }
    if (await exists(this.#backupDir)) {
      throw new ViteOutputBackupExistsError(this.#backupDir)
    }
    if (this.#protectMetadata) {
      for (const name of ["manifest.json", "diagnostics.json"]) {
        const file = path.join(this.#root, ".minista", name)
        this.#metadata.set(name, await exists(file)
          ? await fs.promises.readFile(file, "utf8") : undefined)
      }
    }
    this.#hadOutput = await exists(this.#outDir)
    if (this.#hadOutput && (await fs.promises.lstat(this.#outDir)).isSymbolicLink()) {
      throw new ViteOutputDirectoryUnsafeError(this.#outDir)
    }
    if (this.#hadOutput) {
      await fs.promises.rename(this.#outDir, this.#backupDir)
    }
    this.#outputRestored = false
    this.#begun = true
    try {
      if (this.#hadOutput && this.#preserve) {
        await fs.promises.cp(this.#backupDir, this.#outDir, {
          recursive: true, verbatimSymlinks: true,
        })
      }
    } catch (error) {
      await this.rollback()
      throw error
    }
  }

  async commit() {
    if (!this.#begun) return
    // The new output is committed before deleting the backup. A cleanup failure
    // must never trigger rollback from a potentially partially removed backup.
    this.#begun = false
    this.#metadata.clear()
    if (this.#hadOutput) {
      try {
        await fs.promises.rm(this.#backupDir, { recursive: true, force: true })
      } catch {
        this.cleanupDiagnostic = Object.freeze({
          code: "MINISTA_OUTPUT_TRANSACTION_CLEANUP_FAILED",
          severity: "warning",
          phase: "finalize",
          message: "Output was committed, but its private backup could not be completely removed.",
          hint: "Remove the .minista-*.backup directory beside the output after checking the committed build.",
        })
      }
    }
  }

  async rollback() {
    if (!this.#begun) return
    if (!this.#outputRestored) {
      await fs.promises.rm(this.#outDir, { recursive: true, force: true })
      if (this.#hadOutput) {
        await fs.promises.rename(this.#backupDir, this.#outDir)
      }
      this.#outputRestored = true
    }
    const writer = new NodeAtomicWorkspaceWriter()
    for (const [name, source] of this.#metadata) {
      if (source === undefined) {
        await fs.promises.rm(path.join(this.#root, ".minista", name), { force: true })
      } else {
        await writer.write(this.#root, name, source)
      }
    }
    this.#metadata.clear()
    this.#begun = false
  }
}

/** @param {string} parent @param {string} child */
function isAncestor(parent, child) {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith(`..${path.sep}`) &&
    relative !== ".." && !path.isAbsolute(relative))
}

/** Resolve existing symlink ancestors even when the output does not exist.
 * @param {string} file @returns {Promise<string>}
 */
async function resolvePhysicalPath(file) {
  try {
    return await fs.promises.realpath(file)
  } catch (error) {
    if (!error || typeof error !== "object" || Reflect.get(error, "code") !== "ENOENT") throw error
    return path.join(await resolvePhysicalPath(path.dirname(file)), path.basename(file))
  }
}
