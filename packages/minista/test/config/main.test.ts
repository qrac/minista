import { describe, expect, it } from "vitest"

import { resolveMainConfig } from "../../src/config/main"

describe("resolveMainConfig", () => {
  it("No user config", async () => {
    const result = await resolveMainConfig()
    expect(result.out).toEqual("dist")
  })

  it("Set user config", async () => {
    const userConfig = { assets: { outDir: "ast" } }
    const result = await resolveMainConfig(userConfig)
    expect(result.assets.outDir).toEqual("ast")
  })
})
