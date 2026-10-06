import { describe, expect, test, vi } from "vitest"

import {
  prepareViteClientEnvironment,
  ViteEnvironmentPreparationError,
} from "../../../src/adapters/vite/environment-preparation.js"

describe("Vite environment preparation", () => {
  test("runs explicit Minista hooks in feature dependency order", async () => {
    /** @type {string[]} */
    const calls = []
    const client = {
      plugins: [
        {
          name: "consumer",
          api: {
            minista: {
              feature: {
                id: "consumer",
                apiVersion: 1,
                options: {},
                provides: [],
                requires: ["pages"],
              },
              prepareClient: vi.fn(async () => calls.push("consumer")),
            },
          },
        },
        { name: "third-party" },
        {
          name: "provider",
          api: {
            minista: {
              feature: {
                id: "provider",
                apiVersion: 1,
                options: {},
                provides: ["pages"],
                requires: [],
              },
              prepareClient: vi.fn(async () => calls.push("provider")),
            },
          },
        },
      ],
    }

    await prepareViteClientEnvironment(
      /** @type {any} */ ({ builder: {}, render: {}, client, renderOutput: {} }),
    )

    expect(calls).toEqual(["provider", "consumer"])
  })

  test("reports invalid preparation dependencies with diagnostics", async () => {
    const client = {
      plugins: [
        {
          name: "consumer",
          api: {
            minista: {
              feature: {
                id: "consumer",
                apiVersion: 1,
                options: {},
                provides: [],
                requires: ["missing"],
              },
              prepareClient: vi.fn(),
            },
          },
        },
      ],
    }

    await expect(
      prepareViteClientEnvironment(
        /** @type {any} */ ({ builder: {}, render: {}, client, renderOutput: {} }),
      ),
    ).rejects.toMatchObject({
      code: "MINISTA_VITE_PREPARATION_INVALID",
      name: ViteEnvironmentPreparationError.name,
      diagnostics: [
        expect.objectContaining({
          code: "MINISTA_FEATURE_CAPABILITY_MISSING",
        }),
      ],
    })
  })

  test("does not schedule hooks for capabilities that are already prepared", async () => {
    const prepareClient = vi.fn()
    const client = {
      plugins: [
        {
          name: "provider-without-hook",
          api: {
            minista: {
              feature: {
                id: "provider",
                apiVersion: 1,
                options: {},
                provides: ["pages"],
                requires: [],
              },
            },
          },
        },
        {
          name: "consumer",
          api: {
            minista: {
              feature: {
                id: "consumer",
                apiVersion: 1,
                options: {},
                provides: [],
                requires: ["pages"],
              },
              prepareClient,
            },
          },
        },
        {
          name: "unrelated",
          api: {
            minista: {
              feature: {
                id: "unrelated",
                apiVersion: 1,
                options: {},
                provides: [],
                requires: ["unavailable-outside-preparation"],
              },
            },
          },
        },
      ],
    }

    await prepareViteClientEnvironment(
      /** @type {any} */ ({ builder: {}, render: {}, client, renderOutput: {} }),
    )

    expect(prepareClient).toHaveBeenCalledOnce()
  })
})
