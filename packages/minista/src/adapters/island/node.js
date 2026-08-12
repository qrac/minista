// @ts-check

import { getIslandBuildCode } from "../../plugins/island/utils/code.js"
import { decodeSnippet } from "../../plugins/island/utils/snippet.js"

export class NodeIslandEntryGenerator {
  /** @param {string} encodedSnippet */
  async createSnippet(encodedSnippet) {
    return decodeSnippet(encodedSnippet)
  }

  /**
   * @param {readonly number[]} snippetIndexes
   * @param {import("../../features/island/index.js").IslandFeatureOptions} options
   */
  async createEntry(snippetIndexes, options) {
    return getIslandBuildCode([...snippetIndexes], options)
  }
}
