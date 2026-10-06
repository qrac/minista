// @ts-check

/**
 * dev page snapshotを世代単位で保持し、同時loadを一本化する。
 * invalidate中に古いloadが完了しても次世代のcacheには保存しない。
 *
 * @template Snapshot
 */
export class DevPageCache {
  /** @type {Snapshot | undefined} */
  #snapshot
  /** @type {Promise<Snapshot> | undefined} */
  #pending
  #generation = 0

  /**
   * @param {() => Promise<Snapshot>} load
   * @returns {Promise<Snapshot>}
   */
  get(load) {
    if (this.#snapshot !== undefined) return Promise.resolve(this.#snapshot)
    if (this.#pending) return this.#pending

    const generation = this.#generation
    const pending = load()
    this.#pending = pending

    return pending.then(
      (snapshot) => {
        if (this.#generation === generation) this.#snapshot = snapshot
        if (this.#pending === pending) this.#pending = undefined
        return snapshot
      },
      (error) => {
        if (this.#pending === pending) this.#pending = undefined
        throw error
      },
    )
  }

  /** @returns {Snapshot | undefined} */
  peek() {
    return this.#snapshot
  }

  invalidate() {
    this.#generation += 1
    this.#snapshot = undefined
    this.#pending = undefined
  }
}
