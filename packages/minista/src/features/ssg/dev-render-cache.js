// @ts-check

/** @template Rendered */
export class DevRenderCache {
  /** @type {Map<string, Rendered>} */
  #entries = new Map()

  /**
   * @param {string} pageId
   * @param {() => Promise<Rendered>} render
   * @returns {Promise<Rendered>}
   */
  async get(pageId, render) {
    const cached = this.#entries.get(pageId)
    if (cached !== undefined) return cached
    const rendered = await render()
    this.#entries.set(pageId, rendered)
    return rendered
  }

  /** @param {Iterable<string>} [pageIds] */
  invalidate(pageIds) {
    if (!pageIds) {
      this.#entries.clear()
      return
    }
    for (const pageId of pageIds) this.#entries.delete(pageId)
  }

  /** @param {Iterable<string>} pageIds */
  retain(pageIds) {
    const retained = new Set(pageIds)
    for (const pageId of this.#entries.keys()) {
      if (!retained.has(pageId)) this.#entries.delete(pageId)
    }
  }
}
