import { describe, expect, it } from "vitest"

import { resolveConfig } from "../../src/config"

describe("resolveConfig", () => {
  it("Default", async () => {
    const result = await resolveConfig({})

    //console.log(result)
    expect(result.main.out).toEqual("dist")
  })

  it("Add inline config", async () => {
    const inlineConfig = { out: "out" }
    const result = await resolveConfig(inlineConfig)

    //console.log(result)
    expect(result.main.out).toEqual("out")
  })
})
