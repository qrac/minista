import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"

import { resolveUserConfig } from "../../src/config/user"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("resolveUserConfig", () => {
  it("No file", async () => {
    const result = await resolveUserConfig()

    //console.log(result)
    expect(result).toEqual({})
  })

  it("Set file", async () => {
    const configPath = "../_demo/config.ts"
    const configFile = path.relative(".", path.join(__dirname, configPath))
    const result = await resolveUserConfig({ configFile })

    //console.log(result)
    expect(result).toEqual({ out: "out" })
  })

  it("No file with inline", async () => {
    const result = await resolveUserConfig({ public: "static" })

    //console.log(result)
    expect(result).toEqual({ public: "static" })
  })

  it("Set file with inline", async () => {
    const configPath = "../_demo/config.ts"
    const configFile = path.relative(".", path.join(__dirname, configPath))
    const result = await resolveUserConfig({ configFile, public: "static" })

    //console.log(result)
    expect(result).toEqual({ public: "static", out: "out" })
  })

  it("Set file with relative import", async () => {
    const configPath = "../_demo/config2.ts"
    const configFile = path.relative(".", path.join(__dirname, configPath))
    const result = await resolveUserConfig({ configFile })

    //console.log(result)
    expect(result).toEqual({ out: "out" })
  })
})
