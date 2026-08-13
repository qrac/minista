import { describe, expect, test, vi } from "vitest"

import { ViteDevServerAdapter } from "../../../src/adapters/vite/dev-server.js"

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

    await expect(adapter.start({})).rejects.toThrow("listen failed")
    expect(close).toHaveBeenCalledOnce()
  })
})
