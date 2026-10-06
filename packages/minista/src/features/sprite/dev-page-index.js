// @ts-check

/** @param {string} value */
function normalizeSource(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "")
}

/** @param {string} value */
function normalizePageUrl(value) {
  const pathname = value.split(/[?#]/, 1)[0] || "/"
  return pathname.startsWith("/") ? pathname : `/${pathname}`
}

export class DevSpritePageIndex {
  /** @type {Map<string, Set<string>>} */
  #pagesBySource = new Map()
  /** @type {Map<string, Set<string>>} */
  #sourcesByPage = new Map()

  /**
   * @param {string} pageUrl
   * @param {readonly string[]} sourceDirectories
   */
  replacePage(pageUrl, sourceDirectories) {
    const page = normalizePageUrl(pageUrl)
    const previous = this.#sourcesByPage.get(page) ?? new Set()
    for (const source of previous) {
      const pages = this.#pagesBySource.get(source)
      pages?.delete(page)
      if (pages?.size === 0) this.#pagesBySource.delete(source)
    }

    const sources = new Set(sourceDirectories.map(normalizeSource))
    this.#sourcesByPage.set(page, sources)
    for (const source of sources) {
      const pages = this.#pagesBySource.get(source) ?? new Set()
      pages.add(page)
      this.#pagesBySource.set(source, pages)
    }
  }

  /** @param {string} sourceDirectory */
  getPages(sourceDirectory) {
    return Object.freeze(
      [...(this.#pagesBySource.get(normalizeSource(sourceDirectory)) ?? [])]
        .sort(),
    )
  }
}
