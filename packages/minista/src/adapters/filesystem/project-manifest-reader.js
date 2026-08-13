// @ts-check

import fs from "node:fs"
import path from "node:path"

import {
  parseProjectManifest,
  ProjectManifestInvalidError,
} from "../../core/manifest/index.js"

export class ProjectManifestNotFoundError extends Error {
  code = "MINISTA_MANIFEST_NOT_FOUND"

  constructor() {
    super("Project manifest was not found at .minista/manifest.json.")
    this.name = "ProjectManifestNotFoundError"
  }
}

export class NodeProjectManifestReader {
  /** @param {string} root */
  async read(root) {
    const file = path.resolve(root, ".minista/manifest.json")
    let source
    try {
      source = await fs.promises.readFile(file, "utf8")
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        Reflect.get(error, "code") === "ENOENT"
      ) {
        throw new ProjectManifestNotFoundError()
      }
      throw error
    }
    try {
      return parseProjectManifest(JSON.parse(source))
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
