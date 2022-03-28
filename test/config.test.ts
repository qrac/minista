import { describe, expect, it } from "vitest"

import { getConfig } from "../src/config"

describe("getConfig", () => {
  it("Merge outDir", async () => {
    const userConfig = { outDir: "out" }
    const result = await getConfig(userConfig)

    //console.log(result)
    expect(result.outDir).toEqual(userConfig.outDir)
  })
})
