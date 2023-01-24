import { describe, expect, it } from "vitest"

import { resolveSubConfig } from "../../src/config/sub"
import { defaultMainConfig } from "../../src/config/main"

describe("resolveSubConfig", () => {
  it("Default", async () => {
    const result = await resolveSubConfig(defaultMainConfig)
    expect(result.resolvedBase).toEqual("/")
  })
})
