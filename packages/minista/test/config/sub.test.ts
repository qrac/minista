import { describe, expect, it } from "vitest"

import { resolveSubConfig } from "../../src/config/sub"
import { defaultMainConfig, resolveMainConfig } from "../../src/config/main"

describe("resolveSubConfig", () => {
  it("No entry", async () => {
    const result = await resolveSubConfig(defaultMainConfig)

    //console.log(result)
    expect(result.resolvedEntry).toEqual([])
  })

  it("Set entry", async () => {
    const userConfig = {
      assets: { entry: "src/assets/script.ts" },
    }
    const mergedConfig = await resolveMainConfig(userConfig)
    const result = await resolveSubConfig(mergedConfig)

    //console.log(result)
    expect(result.resolvedEntry).toEqual([
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
        position: "head",
        loadType: "defer",
      },
    ])
  })
})
