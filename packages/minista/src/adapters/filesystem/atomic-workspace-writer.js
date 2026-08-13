// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

export class NodeAtomicWorkspaceWriter {
  /**
   * @param {string} root
   * @param {string} fileName
   * @param {string} source
   */
  async write(root, fileName, source) {
    if (path.basename(fileName) !== fileName || !fileName.endsWith(".json")) {
      throw new TypeError("Workspace metadata file must be a JSON basename.")
    }
    const directory = path.resolve(root, ".minista")
    const file = path.resolve(directory, fileName)
    const pending = path.resolve(
      directory,
      `.${fileName}.${process.pid}.${randomUUID()}.tmp`,
    )
    await fs.promises.mkdir(directory, { recursive: true })
    try {
      await fs.promises.writeFile(pending, source, "utf8")
      await fs.promises.rename(pending, file)
    } catch (error) {
      await fs.promises.rm(pending, { force: true })
      throw error
    }
    return file
  }
}
