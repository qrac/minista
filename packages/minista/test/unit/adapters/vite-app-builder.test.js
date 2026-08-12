import { describe, expect, test, vi } from "vitest"

import {
  ViteAppBuilderAdapter,
  ViteAppEnvironmentNotFoundError,
} from "../../../src/adapters/vite/app-builder.js"

describe("Vite App Builder adapter", () => {
  test("builds render, prepares client, then builds client", async () => {
    /** @type {string[]} */
    const calls = []
    const render = { name: "render" }
    const client = { name: "client" }
    const build = vi.fn(async (environment) => {
      calls.push(`build:${environment.name}`)
      return { output: [{ environment: environment.name }] }
    })
    const builder = { environments: { render, client }, build }
    const factory = vi.fn(async () => builder)
    const prepareClient = vi.fn(async ({ renderOutput }) => {
      calls.push(`prepare:${renderOutput.output[0].environment}`)
    })
    const adapter = new ViteAppBuilderAdapter(/** @type {any} */ (factory))

    const result = await adapter.build(
      { builder: {}, environments: { render: {}, client: {} } },
      { prepareClient },
    )

    expect(factory).toHaveBeenCalledWith(
      { builder: {}, environments: { render: {}, client: {} } },
      false,
    )
    expect(calls).toEqual(["build:render", "prepare:render", "build:client"])
    expect(result).toMatchObject({ builder })
  })

  test("reports a missing configured environment with a stable code", async () => {
    const adapter = new ViteAppBuilderAdapter(
      /** @type {any} */ (async () => ({ environments: { client: {} } })),
    )

    await expect(adapter.build({})).rejects.toMatchObject({
      code: "MINISTA_VITE_APP_ENVIRONMENT_NOT_FOUND",
      name: ViteAppEnvironmentNotFoundError.name,
      message: expect.stringContaining("render"),
    })
  })
})
