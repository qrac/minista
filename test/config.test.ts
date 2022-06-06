import { describe, expect, it } from "vitest"

import {
  mergeConfig,
  mergeAlias,
  resolveConfig,
  defaultConfig,
} from "../src/config"

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

describe("mergeAlias", () => {
  it("Test: mergeAlias", async () => {
    const userConfig = { "~": "src" }
    const result = await mergeAlias(userConfig, {})

    //console.log(result)
    expect(result).toEqual([
      {
        find: "~",
        replacement: "src",
      },
    ])
  })
})

describe("resolveConfig", () => {
  it("Test: resolveConfig", async () => {
    const result = await resolveConfig(defaultConfig)

    //console.log(result)
    expect(result.viteAssetsOutput).toEqual("assets/[name].[ext]")
    expect(result.viteAssetsImagesOutput).toEqual("assets/images/[name].[ext]")
    expect(result.viteAssetsFontsOutput).toEqual("assets/fonts/[name].[ext]")
    expect(result.vitePluginSvgSpriteIconsSrcDir).toEqual("src/assets/icons")
    expect(result.vitePluginSvgSpriteIconsOutput).toEqual(
      "/assets/images/icons.svg"
    )
    expect(result.vitePluginSvgSpriteIconsTempOutput).toEqual(
      "node_modules/.minista/svg-sprite-icons/assets/images/icons.svg"
    )
  })
})
