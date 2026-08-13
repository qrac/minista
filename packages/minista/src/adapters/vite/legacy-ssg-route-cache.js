// @ts-check

import {
  createLegacySsgProject,
  resolveLegacySsgRoute,
} from "./legacy-ssg-project.js"

/** @typedef {import("../../plugins/ssg/types.js").ImportedPages} ImportedPages */
/** @typedef {import("../../plugins/ssg/types.js").PluginOptions} PluginOptions */
/** @typedef {import("./legacy-ssg-project.js").LegacySsgRouteEntry} LegacySsgRouteEntry */

/** @param {string} sourceFile */
function normalizeSourceFile(sourceFile) {
  return sourceFile.replaceAll("\\", "/").replace(/^\/+/, "")
}

export class LegacySsgRouteCache {
  /** @type {Map<string, {module: ImportedPages[string], entry: LegacySsgRouteEntry}>} */
  #entries = new Map()
  /** @type {Set<string>} */
  #invalidated = new Set()
  #optionsKey = ""

  /** @param {Iterable<string>} sourceFiles */
  invalidate(sourceFiles) {
    for (const sourceFile of sourceFiles) {
      this.#invalidated.add(normalizeSourceFile(sourceFile))
    }
  }

  clear() {
    this.#entries.clear()
    this.#invalidated.clear()
  }

  /**
   * @param {ImportedPages} importedPages
   * @param {Pick<PluginOptions, "srcBases">} options
   */
  async resolve(importedPages, options) {
    const optionsKey = JSON.stringify(options.srcBases)
    if (this.#optionsKey !== optionsKey) {
      this.clear()
      this.#optionsKey = optionsKey
    }

    const activeSources = new Set()
    for (const sourceFile of Object.keys(importedPages).sort()) {
      const pageModule = importedPages[sourceFile]
      if (!pageModule) continue
      const sourceKey = normalizeSourceFile(sourceFile)
      activeSources.add(sourceKey)
      const cached = this.#entries.get(sourceKey)
      if (
        !cached ||
        cached.module !== pageModule ||
        this.#invalidated.has(sourceKey)
      ) {
        this.#entries.set(sourceKey, {
          module: pageModule,
          entry: await resolveLegacySsgRoute(sourceFile, pageModule, options),
        })
      }
    }

    for (const sourceKey of this.#entries.keys()) {
      if (!activeSources.has(sourceKey)) this.#entries.delete(sourceKey)
    }
    this.#invalidated.clear()

    return createLegacySsgProject(
      [...this.#entries.values()]
        .map(({ entry }) => entry)
        .sort((a, b) => a.sourceFile.localeCompare(b.sourceFile)),
    )
  }
}
