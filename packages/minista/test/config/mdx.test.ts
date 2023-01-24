import { describe, expect, it } from "vitest"
import remarkGfm from "remark-gfm"

import { getMdxPluginNames, resolveMdxConfig } from "../../src/config/mdx"
import { defaultMainConfig, resolveMainConfig } from "../../src/config/main"

describe("getMdxPluginNames", () => {
  it("No plugins", () => {
    const result = getMdxPluginNames([])
    expect(result).toEqual([])
  })

  it("Set plugin", () => {
    const plugins = [remarkGfm]
    const result = getMdxPluginNames(plugins)
    expect(result).toEqual(["remarkGfm"])
  })
})

describe("resolveMdxConfig", () => {
  it("No plugins", async () => {
    const result = await resolveMdxConfig(defaultMainConfig)
    expect(result.remarkPlugins?.includes(remarkGfm)).toBeTruthy()
  })

  it("Set plugin", async () => {
    const userConfig = {
      markdown: { mdxOptions: { remarkPlugins: [remarkGfm] } },
    }
    const mergedConfig = await resolveMainConfig(userConfig)
    const result = await resolveMdxConfig(mergedConfig)
    const filteredResult = result.remarkPlugins?.filter(
      (plugin) => plugin === remarkGfm
    )
    expect(filteredResult?.length).toEqual(1)
  })
})
