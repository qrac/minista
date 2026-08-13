// @ts-check

import { NodeExternalBuildHandoff } from "../filesystem/external-build-handoff.js"
import { createIslandSnippetsArtifactId, parseIslandSnippets } from "../../features/island/index.js"
import { createRenderedPagesArtifactId, parseRenderedPages } from "../../features/ssg/index.js"

/**
 * compatibility buildのdata source選択をpluginから分離する。
 */
export class ViteBuildDataReader {
  #root
  #session
  #externalBuildId
  #handoff

  /** @param {import("./build-data-reader.js").ViteBuildDataReaderOptions} options */
  constructor(options) {
    this.#root = options.root
    this.#session = options.session
    this.#externalBuildId = options.externalBuildId
    this.#handoff = options.handoff ?? new NodeExternalBuildHandoff()
  }

  async readRenderedPages() {
    const artifact = this.#session
      ? await this.#session.artifacts.get(createRenderedPagesArtifactId())
      : undefined
    if (artifact) {
      return parseRenderedPages(JSON.parse(String(artifact.content)))
    }
    if (!this.#externalBuildId) return Object.freeze([])
    return await this.#handoff.readRenderedPages(
      this.#root,
      this.#externalBuildId,
    ) ?? Object.freeze([])
  }

  async readIslandSnippets() {
    const artifact = this.#session
      ? await this.#session.artifacts.get(createIslandSnippetsArtifactId())
      : undefined
    if (artifact) {
      return parseIslandSnippets(JSON.parse(String(artifact.content)))
    }
    if (!this.#externalBuildId) return Object.freeze([])
    return await this.#handoff.readIslandSnippets(
      this.#root,
      this.#externalBuildId,
    ) ?? Object.freeze([])
  }
}
