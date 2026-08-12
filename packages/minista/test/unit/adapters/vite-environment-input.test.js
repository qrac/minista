import { describe, expect, test } from "vitest"

import { ViteEnvironmentInputAdapter } from "../../../src/adapters/vite/environment-input.js"

describe("Vite environment input adapter", () => {
  test("replaces input without discarding other resolved Rolldown options", () => {
    const environment = {
      config: {
        build: {
          rolldownOptions: {
            external: ["react"],
            input: { initial: "/initial.js" },
          },
        },
      },
    }

    new ViteEnvironmentInputAdapter().apply(
      /** @type {any} */ (environment),
      { prepared: "/prepared.js" },
    )

    expect(environment.config.build.rolldownOptions).toEqual({
      external: ["react"],
      input: { prepared: "/prepared.js" },
    })
  })
})
