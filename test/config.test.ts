import { describe, expect, it } from "vitest"

import { mergeConfig } from "../src/config"

describe("mergeConfig", () => {
  it("Test: mergeConfig", async () => {
    const userConfig = { out: "out" }
    const result = await mergeConfig(userConfig)

    //console.log(result)
    expect(result.out).toEqual(userConfig.out)
  })

  it("Test: mergeConfig of deep with override array", async () => {
    const userConfig = { pages: { srcExt: ["tsx"] } }
    const result = await mergeConfig(userConfig)

    //console.log(result)
    expect(result.pages.srcExt).toEqual(userConfig.pages.srcExt)
  })
})
