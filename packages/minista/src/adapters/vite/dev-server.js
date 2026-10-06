// @ts-check

import { createServer } from "vite"

import {
  attachViteBuildSession,
  createViteBuildSession,
  disposeViteBuildSession,
  getViteBuildSession,
} from "./build-session.js"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").ViteDevServer} ViteDevServer */

export class ViteDevServerError extends Error {
  code = "MINISTA_VITE_DEV_SERVER_FAILED"

  /**
   * @param {unknown} cause
   * @param {import("./dev-server.js").ViteDevServerOperation} operation
   */
  constructor(cause, operation) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const message = `Vite dev server ${operation} failed: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "ViteDevServerError"
    this.operation = operation
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      phase: operation === "close" ? "finalize" : "resolve",
      hint: operation === "listen"
        ? "Check the configured host and whether the port is already in use."
        : "Review the preceding Vite output and dev server configuration.",
    })
  }
}

/**
 * @param {unknown} error
 * @param {import("./dev-server.js").ViteDevServerOperation} operation
 */
function normalizeViteDevServerError(error, operation) {
  if (
    error instanceof Error &&
    typeof Reflect.get(error, "code") === "string" &&
    Reflect.get(error, "code").startsWith("MINISTA_")
  ) {
    return error
  }
  return new ViteDevServerError(error, operation)
}

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
    const session = getViteBuildSession(config) ?? createViteBuildSession()
    const serverConfig = attachViteBuildSession(config, session)
    let server
    try {
      server = await this.#createServer({ ...serverConfig, appType: "custom" })
    } catch (error) {
      await disposeViteBuildSession(session)
      throw normalizeViteDevServerError(error, "create")
    }
    try {
      await server.listen()
    } catch (error) {
      try {
        await server.close()
      } catch {
        // Preserve the listen failure as the actionable root cause.
      }
      await disposeViteBuildSession(session)
      throw normalizeViteDevServerError(error, "listen")
    }

    try {
      if (options.printUrls !== false) server.printUrls()
      if (options.bindShortcuts ?? Boolean(process.stdin.isTTY)) {
        server.bindCLIShortcuts({ print: true })
      }
    } catch (error) {
      try {
        await server.close()
      } catch {
        // Preserve the configuration failure as the actionable root cause.
      }
      await disposeViteBuildSession(session)
      throw normalizeViteDevServerError(error, "configure")
    }

    let closed = false
    return Object.freeze({
      server,
      async close() {
        if (closed) return
        closed = true
        try {
          await server.close()
        } catch (error) {
          throw normalizeViteDevServerError(error, "close")
        } finally {
          await disposeViteBuildSession(session)
        }
      },
    })
  }
}
