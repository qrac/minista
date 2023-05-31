import { describe, expect, it } from "vitest"

import { resolveMdxConfig } from "../../src/config/mdx"
import { defaultMainConfig } from "../../src/config/main"

describe("resolveMdxConfig", () => {
  it("Default", async () => {
    const result = await resolveMdxConfig(defaultMainConfig)
    expect(result.remarkPlugins?.length).toEqual(3)
  })
})
