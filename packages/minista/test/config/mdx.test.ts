import { describe, expect, it } from "vitest"
import remarkGfm from "remark-gfm"

import { getMdxPluginNames, resolveMdxConfig } from "../../src/config/mdx"
import { defaultMainConfig, resolveMainConfig } from "../../src/config/main"

describe("getMdxPluginNames", () => {
  it("No plugins", () => {
    const result = getMdxPluginNames([])

    //console.log(result)
    expect(result).toEqual([])
  })

  it("Set plugin", () => {
    const plugins = [remarkGfm]
    const result = getMdxPluginNames(plugins)

    //console.log("plugins:", plugins[0].name)
    //console.log("result", result)
    expect(result).toEqual(["remarkGfm"])
  })
})

describe("resolveMdxConfig", () => {
  it("No plugins", async () => {
    const result = await resolveMdxConfig(defaultMainConfig)

    //console.log(result)
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

    //console.log(result)
    expect(filteredResult?.length).toEqual(1)
  })
})
