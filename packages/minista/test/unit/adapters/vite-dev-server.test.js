import { describe, expect, test, vi } from "vitest"

import {
  ViteDevServerAdapter,
  ViteDevServerError,
} from "../../../src/adapters/vite/dev-server.js"

describe("Vite dev server adapter", () => {
  test("owns a custom app server lifecycle", async () => {
    const listen = vi.fn(async () => {})
    const close = vi.fn(async () => {})
    const printUrls = vi.fn()
    const bindCLIShortcuts = vi.fn()
    const server = { listen, close, printUrls, bindCLIShortcuts }
    const factory = vi.fn(async () => server)
    const adapter = new ViteDevServerAdapter(/** @type {any} */ (factory))

    const running = await adapter.start(
      { root: "/project", appType: "spa" },
      { printUrls: false, bindShortcuts: false },
    )

    expect(factory).toHaveBeenCalledWith({
      root: "/project",
      appType: "custom",
    })
    expect(listen).toHaveBeenCalledOnce()
    expect(printUrls).not.toHaveBeenCalled()
    expect(bindCLIShortcuts).not.toHaveBeenCalled()

    await running.close()
    await running.close()
    expect(close).toHaveBeenCalledOnce()
  })

  test("closes a partially created server when listen fails", async () => {
    const close = vi.fn(async () => {})
    const adapter = new ViteDevServerAdapter(
      /** @type {any} */ (async () => ({
        listen: async () => { throw new Error("listen failed") },
        close,
      })),
    )

    await expect(adapter.start({})).rejects.toMatchObject({
      code: "MINISTA_VITE_DEV_SERVER_FAILED",
      name: ViteDevServerError.name,
      operation: "listen",
      diagnostic: {
        severity: "error",
        phase: "resolve",
      },
    })
    expect(close).toHaveBeenCalledOnce()
  })

  test("normalizes server creation failures", async () => {
    const adapter = new ViteDevServerAdapter(
      /** @type {any} */ (async () => {
        throw new Error("config failed")
      }),
    )

    await expect(adapter.start({})).rejects.toMatchObject({
      code: "MINISTA_VITE_DEV_SERVER_FAILED",
      operation: "create",
      cause: expect.objectContaining({ message: "config failed" }),
    })
  })

  test("closes the server and normalizes startup configuration failures", async () => {
    const close = vi.fn(async () => {})
    const adapter = new ViteDevServerAdapter(
      /** @type {any} */ (async () => ({
        listen: async () => {},
        close,
        printUrls() {
          throw new Error("print failed")
        },
      })),
    )

    await expect(adapter.start({}, {
      bindShortcuts: false,
    })).rejects.toMatchObject({
      code: "MINISTA_VITE_DEV_SERVER_FAILED",
      operation: "configure",
    })
    expect(close).toHaveBeenCalledOnce()
  })

  test("normalizes close failures and remains idempotent", async () => {
    const close = vi.fn(async () => {
      throw new Error("close failed")
    })
    const adapter = new ViteDevServerAdapter(
      /** @type {any} */ (async () => ({
        listen: async () => {},
        close,
        printUrls() {},
      })),
    )
    const running = await adapter.start({}, {
      printUrls: false,
      bindShortcuts: false,
    })

    await expect(running.close()).rejects.toMatchObject({
      code: "MINISTA_VITE_DEV_SERVER_FAILED",
      operation: "close",
      diagnostic: { phase: "finalize" },
    })
    await expect(running.close()).resolves.toBeUndefined()
    expect(close).toHaveBeenCalledOnce()
  })
})
