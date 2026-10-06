import { describe, expect, test } from "vitest"

import {
  ViteEnvironmentInputAdapter,
  ViteEnvironmentInputMergeError,
} from "../../../src/adapters/vite/environment-input.js"

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

  test("merges named entries into the current input", () => {
    const environment = {
      config: {
        build: {
          rolldownOptions: { input: { ssg: "/through.js" } },
        },
      },
    }

    new ViteEnvironmentInputAdapter().merge(
      /** @type {any} */ (environment),
      { client: "/client.js" },
    )

    expect(environment.config.build.rolldownOptions.input).toEqual({
      ssg: "/through.js",
      client: "/client.js",
    })
  })

  test("rejects merging into an unnamed input", () => {
    const environment = {
      config: { build: { rolldownOptions: { input: "/entry.js" } } },
    }

    expect(() =>
      new ViteEnvironmentInputAdapter().merge(
        /** @type {any} */ (environment),
        { client: "/client.js" },
      ),
    ).toThrowError(ViteEnvironmentInputMergeError)
  })
})
