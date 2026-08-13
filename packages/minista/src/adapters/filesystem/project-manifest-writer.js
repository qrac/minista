// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import { serializeProjectManifest } from "../../core/manifest/index.js"

export class NodeProjectManifestWriter {
  /**
   * @param {string} root
   * @param {import("../../core/manifest/index.js").ProjectManifest} manifest
   */
  async write(root, manifest) {
    const directory = path.resolve(root, ".minista")
    const file = path.resolve(directory, "manifest.json")
    const pending = path.resolve(
      directory,
      `.manifest.${process.pid}.${randomUUID()}.tmp`,
    )
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
}
