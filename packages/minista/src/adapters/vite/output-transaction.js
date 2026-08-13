// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

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

  /**
   * @param {{root: string, outDir: string, buildId?: string}} options
   */
  constructor(options) {
    const root = path.resolve(options.root)
    const outDir = path.resolve(root, options.outDir)
    if (outDir === root || outDir === path.parse(outDir).root) {
      throw new ViteOutputDirectoryUnsafeError(outDir)
    }
    const label = (options.buildId ?? randomUUID())
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80)
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
    if (await exists(this.#backupDir)) {
      throw new ViteOutputBackupExistsError(this.#backupDir)
    }
    this.#hadOutput = await exists(this.#outDir)
    if (this.#hadOutput) {
      await fs.promises.rename(this.#outDir, this.#backupDir)
    }
    this.#begun = true
  }

  async commit() {
    if (!this.#begun) return
    if (this.#hadOutput) {
      await fs.promises.rm(this.#backupDir, { recursive: true, force: true })
    }
    this.#begun = false
  }

  async rollback() {
    if (!this.#begun) return
    await fs.promises.rm(this.#outDir, { recursive: true, force: true })
    if (this.#hadOutput) {
      await fs.promises.rename(this.#backupDir, this.#outDir)
    }
    this.#begun = false
  }
}
