// @ts-check

/** @template State */
export class ViteEnvironmentState {
  /** @type {() => State} */
  #create
  /** @type {WeakMap<object, State>} */
  #objectStates = new WeakMap()
  /** @type {Map<string, State>} */
  #namedStates = new Map()

  /** @param {() => State} create */
  constructor(create) {
    this.#create = create
  }

  /**
   * @param {object | string | undefined} environment
   * @returns {State}
   */
  get(environment) {
    if (environment && typeof environment === "object") {
      if (!this.#objectStates.has(environment)) {
        this.#objectStates.set(environment, this.#create())
      }
      return /** @type {State} */ (this.#objectStates.get(environment))
    }
    const key = environment || "legacy"
    if (!this.#namedStates.has(key)) this.#namedStates.set(key, this.#create())
    return /** @type {State} */ (this.#namedStates.get(key))
  }

  /** @param {object | string | undefined} environment */
  delete(environment) {
    if (environment && typeof environment === "object") {
      this.#objectStates.delete(environment)
      return
    }
    this.#namedStates.delete(environment || "legacy")
  }

  clear() {
    this.#objectStates = new WeakMap()
    this.#namedStates.clear()
  }
}
