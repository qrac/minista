import { describe, expect, it } from "vitest"

import { resolveImageOptimize } from "../../src/config/image"
import { resolveConfig } from "../../src/config"

describe("resolveImageOptimize", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images
    const result = resolveImageOptimize(optimize, "{}")

    //console.log(result)
    expect(result.layout).toEqual("constrained")
  })

  it("Blank", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images
    const result = resolveImageOptimize(optimize, "")

    //console.log(result)
    expect(result.layout).toEqual("constrained")
  })

  it("Override", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images
    const result = resolveImageOptimize(optimize, `{"layout":"fixed"}`)

    //console.log(result)
    expect(result.layout).toEqual("fixed")
  })
})
