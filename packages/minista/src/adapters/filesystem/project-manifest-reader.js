// @ts-check

import fs from "node:fs"
import path from "node:path"
import { resolveWorkspaceDirectory } from "./workspace-directory.js"

import {
  migrateProjectManifest,
  parseProjectManifest,
  ProjectManifestInvalidError,
} from "../../core/manifest/index.js"

export class ProjectManifestNotFoundError extends Error {
  code = "MINISTA_MANIFEST_NOT_FOUND"

  /** @param {string} [file] */
  constructor(file = ".minista/manifest.json") {
    super(`Project manifest was not found at ${file}.`)
    this.name = "ProjectManifestNotFoundError"
  }
}

export class NodeProjectManifestReader {
  #migrations

  /** @param {readonly import("../../core/manifest/index.js").ProjectManifestMigration[]} [migrations] */
  constructor(migrations = []) {
    this.#migrations = migrations
  }

  /** @param {string} root */
  async read(root) {
    const file = path.join(resolveWorkspaceDirectory(root), "manifest.json")
    let source
    try {
      source = await fs.promises.readFile(file, "utf8")
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        Reflect.get(error, "code") === "ENOENT"
      ) {
        throw new ProjectManifestNotFoundError(path.relative(root, file).split(path.sep).join("/"))
      }
      throw error
    }
    try {
      return parseProjectManifest(
        migrateProjectManifest(JSON.parse(source), this.#migrations),
      )
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ProjectManifestInvalidError(
          "Project manifest contains invalid JSON.",
        )
      }
      throw error
    }
  }
}
