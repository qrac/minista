import { EventEmitter } from "node:events"

import { describe, expect, test, vi } from "vitest"

import {
  ViteCliProcessAdapter,
  ViteCliProcessError,
} from "../../../src/adapters/vite/cli-process.js"

/**
 * @param {(child: EventEmitter) => void} complete
 */
function createAdapter(complete) {
  const factory = vi.fn(() => {
    const child = new EventEmitter()
    queueMicrotask(() => complete(child))
    return /** @type {import("node:child_process").ChildProcess} */ (
      /** @type {unknown} */ (child)
    )
  })
  return { adapter: new ViteCliProcessAdapter(factory), factory }
}

describe("external Vite CLI process adapter", () => {
  test("passes arguments and scoped variables to a successful process", async () => {
    const { adapter, factory } = createAdapter((child) => {
      child.emit("close", 0, null)
    })

    await expect(adapter.run(["build", "site"], {
      environment: "client",
      variables: { MINISTA_EXTERNAL_BUILD_ID: "build:test" },
    })).resolves.toBe(0)
    expect(factory).toHaveBeenCalledWith(
      "vite",
      ["build", "site"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          MINISTA_EXTERNAL_BUILD_ID: "build:test",
        }),
      }),
    )
  })

  test("normalizes a non-zero exit into a structured diagnostic", async () => {
    const { adapter } = createAdapter((child) => {
      child.emit("close", 2, null)
    })

    await expect(adapter.run(["build"], {
      environment: "render",
      phase: "bundle",
    })).rejects.toMatchObject({
      code: "MINISTA_VITE_CLI_FAILED",
      name: ViteCliProcessError.name,
      environment: "render",
      exitCode: 2,
      diagnostic: {
        code: "MINISTA_VITE_CLI_FAILED",
        severity: "error",
        phase: "bundle",
      },
    })
  })

  test("records process signals without exposing command arguments", async () => {
    const { adapter } = createAdapter((child) => {
      child.emit("close", null, "SIGTERM")
    })

    await expect(adapter.run(["build", "secret-project"], {
      environment: "client",
    })).rejects.toMatchObject({
      signal: "SIGTERM",
      diagnostic: {
        message: expect.not.stringContaining("secret-project"),
      },
    })
  })

  test("normalizes spawn failures", async () => {
    const { adapter } = createAdapter((child) => {
      child.emit("error", new Error("spawn ENOENT"))
    })

    await expect(adapter.run(["build"], {
      environment: "render",
    })).rejects.toMatchObject({
      code: "MINISTA_VITE_CLI_FAILED",
      cause: expect.objectContaining({ message: "spawn ENOENT" }),
    })
  })
})
