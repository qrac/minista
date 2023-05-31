import { describe, expect, it } from "vitest"

import { resolveAlias } from "../../src/config/alias"

describe("resolveAlias", () => {
  it("No props", async () => {
    const configAlias = {}
    const viteConfigAlias = {}
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([])
  })

  it("One object from main config", async () => {
    const configAlias = { test: "../test" }
    const viteConfigAlias = {}
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([{ find: "test", replacement: "../test" }])
  })

  it("Twe object from main config", async () => {
    const configAlias = { test: "../test", test_2: "../../test2" }
    const viteConfigAlias = {}
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([
      { find: "test", replacement: "../test" },
      { find: "test_2", replacement: "../../test2" },
    ])
  })

  it("One array from main config", async () => {
    const configAlias = [{ find: "test", replacement: "../test" }]
    const viteConfigAlias = {}
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([{ find: "test", replacement: "../test" }])
  })

  it("One object from vite config", async () => {
    const configAlias = {}
    const viteConfigAlias = { test: "../test" }
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([{ find: "test", replacement: "../test" }])
  })

  it("Twe object from both", async () => {
    const configAlias = { test: "../test" }
    const viteConfigAlias = { test_2: "../../test2" }
    const result = await resolveAlias(configAlias, viteConfigAlias)
    expect(result).toEqual([
      { find: "test", replacement: "../test" },
      { find: "test_2", replacement: "../../test2" },
    ])
  })
})
