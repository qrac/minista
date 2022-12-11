import { describe, expect, it } from "vitest"

import {
  resolveViteAssetFileNames,
  resolveViteConfig,
} from "../../src/config/vite"
import { defaultMainConfig, resolveMainConfig } from "../../src/config/main"
import { resolveSubConfig } from "../../src/config/sub"

describe("resolveViteAssetFileNames", () => {
  // Stopped by vite 3 bug
  /*it("Default", async () => {
    const mainConfig = await resolveMainConfig()
    const result = resolveViteAssetFileNames(
      { name: "style.css", source: "", type: "asset" },
      mainConfig
    )

    //console.log(result)
    expect(result).toEqual("assets/bundle.[ext]")
  })*/

  it("Fonts", async () => {
    const mainConfig = await resolveMainConfig()
    const result = resolveViteAssetFileNames(
      { name: "font.woff", source: "", type: "asset" },
      mainConfig
    )

    //console.log(result)
    expect(result).toEqual("assets/fonts/[name].[ext]")
  })
})

describe("resolveViteConfig", () => {
  it("Default", async () => {
    const mainConfig = defaultMainConfig
    const subConfig = await resolveSubConfig(defaultMainConfig)
    const result = await resolveViteConfig(mainConfig, subConfig)

    //console.log(result)
    expect(result.build?.outDir).toEqual("dist")
  })

  it("Add user config", async () => {
    const mainConfig = await resolveMainConfig({ out: "out" })
    const subConfig = await resolveSubConfig(defaultMainConfig)
    const result = await resolveViteConfig(mainConfig, subConfig)

    //console.log(result)
    expect(result.build?.outDir).toEqual("out")
  })
})
