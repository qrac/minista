// @ts-check

import { serializeProjectManifest } from "../../core/manifest/index.js"
import { NodeAtomicWorkspaceWriter } from "./atomic-workspace-writer.js"

export class NodeProjectManifestWriter {
  #writer = new NodeAtomicWorkspaceWriter()

  /**
   * @param {string} root
   * @param {import("../../core/manifest/index.js").ProjectManifest} manifest
   */
  async write(root, manifest) {
    return this.#writer.write(
      root,
      "manifest.json",
      serializeProjectManifest(manifest),
    )
  }
}
