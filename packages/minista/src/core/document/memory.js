// @ts-check

/** @typedef {import("../graph/index.js").PageId} PageId */
/** @typedef {import("./types.js").HtmlDocument} HtmlDocument */

export class MemoryHtmlDocumentStore {
  /** @type {Map<PageId, HtmlDocument>} */
  #documents = new Map()

  /** @param {HtmlDocument} document */
  put(document) {
    const current = this.#documents.get(document.pageId)
    if (current && current !== document) {
      throw new Error(`HTML document ${document.pageId} is already registered.`)
    }
    this.#documents.set(document.pageId, document)
  }

  /** @param {HtmlDocument} document */
  replace(document) {
    this.#documents.set(document.pageId, document)
  }

  /** @param {PageId} pageId */
  delete(pageId) {
    return this.#documents.delete(pageId)
  }

  /** @param {PageId} pageId */
  get(pageId) {
    return this.#documents.get(pageId)
  }

  list() {
    return Object.freeze(
      [...this.#documents.values()].sort((left, right) =>
        left.pageId.localeCompare(right.pageId),
      ),
    )
  }

  clear() {
    this.#documents.clear()
  }
}
