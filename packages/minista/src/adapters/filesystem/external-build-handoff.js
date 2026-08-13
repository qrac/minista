// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import {
  parseProjectManifest,
  serializeProjectManifest,
} from "../../core/manifest/index.js"

/** @param {string} buildId */
function assertBuildId(buildId) {
  if (!/^[a-zA-Z0-9:_-]+$/.test(buildId)) {
    throw new TypeError("External build ID contains unsupported characters.")
  }
}

/** @param {string} root @param {string} buildId */
function resolveDirectory(root, buildId) {
  assertBuildId(buildId)
  return path.resolve(root, ".minista", "work", buildId, "external")
}

/** @param {string} root @param {string} buildId */
function resolveBuildDirectory(root, buildId) {
  assertBuildId(buildId)
  return path.resolve(root, ".minista", "work", buildId)
}

export class NodeExternalBuildHandoff {
  /**
   * @param {string} root
   * @param {string} buildId
   * @param {import("../../core/manifest/index.js").ProjectManifest} manifest
   */
  async write(root, buildId, manifest) {
    const directory = resolveDirectory(root, buildId)
    const file = path.resolve(directory, "manifest.json")
    const pending = path.resolve(directory, `.manifest.${randomUUID()}.tmp`)
    await fs.promises.mkdir(directory, { recursive: true })
    try {
      await fs.promises.writeFile(
        pending,
        serializeProjectManifest(manifest),
        "utf8",
      )
      await fs.promises.rename(pending, file)
    } catch (error) {
      await fs.promises.rm(pending, { force: true })
      throw error
    }
    return file
  }

  /** @param {string} root @param {string} buildId */
  async read(root, buildId) {
    const file = path.resolve(
      resolveDirectory(root, buildId),
      "manifest.json",
    )
    try {
      return parseProjectManifest(
        JSON.parse(await fs.promises.readFile(file, "utf8")),
      )
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        Reflect.get(error, "code") === "ENOENT"
      ) {
        return undefined
      }
      throw error
    }
  }

  /** @param {string} root @param {string} buildId */
  async clear(root, buildId) {
    await fs.promises.rm(resolveBuildDirectory(root, buildId), {
      recursive: true,
      force: true,
    })
    await fs.promises.rmdir(path.resolve(root, ".minista", "work"))
      .catch(() => {})
  }
}
