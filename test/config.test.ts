import { describe, expect, it } from "vitest"

import {
  mergeConfig,
  resolveEntry,
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

describe("resolveEntry", () => {
  it("Test: resolveEntry str", async () => {
    const userConfig = "./entry.ts"
    const result = await resolveEntry(userConfig)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "entry",
        input: "entry.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
    ])
  })

  it("Test: resolveEntry obj", async () => {
    const userConfig = { entry: "./01.ts", script: "./src/assets/script.ts" }
    const result = await resolveEntry(userConfig)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "entry",
        input: "01.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
    ])
  })

  it("Test: resolveEntry arry", async () => {
    const userConfig = ["./entry.ts", "./src/assets/script.ts"]
    const result = await resolveEntry(userConfig)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "entry",
        input: "entry.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
      {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
    ])
  })

  it("Test: resolveEntry custom arry", async () => {
    const userConfig = [
      {
        name: "smp",
        input: "./smp.ts",
        insertPages: { include: ["smp/**/*"], exclude: ["404"] },
      },
      {
        name: "pc",
        input: "/src/assets/pc.ts",
        insertPages: { include: ["pc/**/*"] },
      },
    ]
    const result = await resolveEntry(userConfig)

    //console.log(result)
    expect(result).toEqual([
      {
        name: "smp",
        input: "smp.ts",
        insertPages: { include: ["smp/**/*"], exclude: ["404"] },
      },
      {
        name: "pc",
        input: "src/assets/pc.ts",
        insertPages: { include: ["pc/**/*"], exclude: [] },
      },
    ])
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
