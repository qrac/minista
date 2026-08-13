// @ts-check

import { createServer } from "vite"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteDevServer} ViteDevServer */

export class ViteDevServerAdapter {
  #createServer

  /** @param {(config: InlineConfig) => Promise<ViteDevServer>} [factory] */
  constructor(factory = createServer) {
    this.#createServer = factory
  }

  /**
   * @param {InlineConfig} config
   * @param {{printUrls?: boolean, bindShortcuts?: boolean}} [options]
   */
  async start(config, options = {}) {
    const server = await this.#createServer({ ...config, appType: "custom" })
    try {
      await server.listen()
    } catch (error) {
      await server.close()
      throw error
    }

    if (options.printUrls !== false) server.printUrls()
    if (options.bindShortcuts ?? Boolean(process.stdin.isTTY)) {
      server.bindCLIShortcuts({ print: true })
    }

    let closed = false
    return Object.freeze({
      server,
      async close() {
        if (closed) return
        closed = true
        await server.close()
      },
    })
  }
}
